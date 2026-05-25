"""Multi-agent orchestration using LangGraph ReAct with domain tools."""
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.conversation import Conversation
from src.tools.domain_tools import _make_tools

router = APIRouter()

_bearer = HTTPBearer(auto_error=False)


def _get_raw_token(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    return credentials.credentials if credentials else ""


def _get_service_urls() -> dict:
    return {
        "productivity": settings.productivity_service_url,
        "habit": settings.habit_service_url,
        "finance": settings.finance_service_url,
        "rag": settings.rag_service_url,
        "career": settings.career_service_url,
    }


class AgentRunRequest(BaseModel):
    message: str
    conversation_id: uuid.UUID | None = None


class AgentRunResponse(BaseModel):
    conversation_id: uuid.UUID
    reply: str
    tools_used: list[str]
    steps: int


class AgentInfo(BaseModel):
    name: str
    description: str
    tools: list[str]


@router.get("/", response_model=list[AgentInfo])
async def list_agents() -> list[AgentInfo]:
    return [
        AgentInfo(
            name="ProductivityAgent",
            description="Manages tasks, projects, scheduling, and reminders",
            tools=["create_task", "list_tasks", "update_task_status"],
        ),
        AgentInfo(
            name="FinanceAgent",
            description="Handles expense tracking, budgets, and financial insights",
            tools=["log_expense", "get_spending_summary", "get_budget_status"],
        ),
        AgentInfo(
            name="KnowledgeAgent",
            description="RAG-powered document search and Q&A",
            tools=["search_knowledge", "answer_from_knowledge"],
        ),
        AgentInfo(
            name="CareerAgent",
            description="Resume analysis, interview prep, and career coaching",
            tools=["get_career_suggestions"],
        ),
        AgentInfo(
            name="HabitAgent",
            description="Habit tracking, streak coaching, and wellness insights",
            tools=["list_habits", "log_habit"],
        ),
    ]


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(
    body: AgentRunRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    token: str = Depends(_get_raw_token),
) -> AgentRunResponse:
    """Run the multi-agent coordinator with tool calling."""
    if not settings.google_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured — set GOOGLE_API_KEY",
        )

    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langgraph.prebuilt import create_react_agent

    tools = _make_tools(token, str(user_id), _get_service_urls())

    llm = ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=settings.google_api_key,
        temperature=0.3,
    )

    system_prompt = (
        "You are YourBestPeer — an AI life assistant with tools to manage the user's tasks, habits, "
        "finances, knowledge base, and career. When the user asks you to do something, USE THE TOOLS "
        "to actually do it. Don't just describe what you would do — do it.\n\n"
        "Guidelines:\n"
        "- Use list_tasks / list_habits before creating duplicates\n"
        "- Always confirm what you did with specific details (IDs, amounts, names)\n"
        "- Chain tools when needed (e.g., list tasks then update one)\n"
        "- Be concise in your final response"
    )

    agent = create_react_agent(llm, tools, prompt=system_prompt)

    tools_used: list[str] = []
    steps = 0
    final_reply = ""

    try:
        result = await agent.ainvoke({"messages": [HumanMessage(content=body.message)]})
        messages = result.get("messages", [])
        steps = len(messages)

        for msg in messages:
            msg_type = type(msg).__name__
            if msg_type == "ToolMessage" or (hasattr(msg, "type") and msg.type == "tool"):
                name = getattr(msg, "name", None) or getattr(msg, "tool_call_id", "")
                if name and name not in tools_used:
                    tools_used.append(name)
            if msg_type == "AIMessage" or (hasattr(msg, "type") and msg.type == "ai"):
                content = msg.content
                if isinstance(content, str) and content.strip():
                    final_reply = content

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {e}")

    # Persist to conversation
    from sqlalchemy import select
    conversation: Conversation | None = None
    if body.conversation_id:
        res = await db.execute(
            select(Conversation).where(
                Conversation.id == body.conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conversation = res.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(user_id=user_id, messages=[])
        db.add(conversation)
        await db.flush()

    now = datetime.utcnow().isoformat()
    msgs: list[dict] = list(conversation.messages or [])
    msgs.append({"role": "user", "content": body.message, "timestamp": now})
    msgs.append({"role": "assistant", "content": final_reply, "timestamp": now,
                 "tools_used": tools_used, "steps": steps})

    if len(msgs) <= 2 and conversation.title == "New conversation":
        conversation.title = body.message[:60]

    conversation.messages = msgs
    await db.flush()

    return AgentRunResponse(
        conversation_id=conversation.id,
        reply=final_reply,
        tools_used=tools_used,
        steps=steps,
    )


@router.post("/run/stream")
async def run_agent_stream(
    body: AgentRunRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    token: str = Depends(_get_raw_token),
) -> StreamingResponse:
    """Stream multi-agent execution events (tool calls + final answer)."""
    if not settings.google_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured",
        )

    from langchain_core.messages import HumanMessage
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langgraph.prebuilt import create_react_agent

    tools = _make_tools(token, str(user_id), _get_service_urls())
    llm = ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=settings.google_api_key,
        temperature=0.3,
    )
    system_prompt = (
        "You are YourBestPeer — an AI life assistant with tools to manage tasks, habits, finances, "
        "knowledge, and career. Use tools to take real actions. Be concise."
    )
    agent = create_react_agent(llm, tools, prompt=system_prompt)

    async def event_gen():
        tools_used: list[str] = []
        final_reply = ""
        try:
            async for event in agent.astream_events(
                {"messages": [HumanMessage(content=body.message)]},
                version="v1",
            ):
                kind = event.get("event", "")

                if kind == "on_tool_start":
                    tool_name = event.get("name", "")
                    tool_input = event.get("data", {}).get("input", {})
                    tools_used.append(tool_name)
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name, 'input': tool_input})}\n\n"

                elif kind == "on_tool_end":
                    tool_name = event.get("name", "")
                    output = event.get("data", {}).get("output", "")
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': tool_name, 'output': str(output)[:300]})}\n\n"

                elif kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        final_reply += chunk.content
                        yield f"data: {json.dumps({'type': 'token', 'token': chunk.content})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'done', 'tools_used': tools_used, 'reply': final_reply})}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")
