"""LangChain tools that call domain microservices."""
from typing import Optional

import httpx
from langchain_core.tools import tool


def _make_tools(token: str, user_id: str, service_urls: dict):
    """Create all domain tools bound to the current user's auth token."""

    productivity_url = service_urls["productivity"]
    habit_url = service_urls["habit"]
    finance_url = service_urls["finance"]
    rag_url = service_urls["rag"]
    career_url = service_urls["career"]

    headers = {"Authorization": f"Bearer {token}"}

    # ── Productivity tools ────────────────────────────────────────────────

    @tool
    async def create_task(title: str, description: str = "", priority: str = "medium") -> str:
        """Create a new task for the user. Priority: low, medium, high, urgent."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                f"{productivity_url}/tasks/",
                json={"title": title, "description": description, "priority": priority, "status": "todo"},
                headers=headers,
            )
            if r.is_success:
                t = r.json()
                return f"Task created: '{t['title']}' (id={t['id']}, priority={t['priority']})"
            return f"Failed to create task: {r.status_code}"

    @tool
    async def list_tasks(status_filter: str = "all") -> str:
        """List the user's tasks. status_filter: all, todo, in_progress, done."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{productivity_url}/tasks/", headers=headers)
            if not r.is_success:
                return f"Failed to fetch tasks: {r.status_code}"
            tasks = r.json()
            if status_filter != "all":
                tasks = [t for t in tasks if t["status"] == status_filter]
            if not tasks:
                return f"No tasks found with status='{status_filter}'"
            lines = [f"- [{t['status']}] {t['title']} (priority={t['priority']})" for t in tasks[:15]]
            return f"Tasks ({len(tasks)} total):\n" + "\n".join(lines)

    @tool
    async def update_task_status(task_id: str, new_status: str) -> str:
        """Update a task's status. new_status: todo, in_progress, done."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.patch(
                f"{productivity_url}/tasks/{task_id}",
                json={"status": new_status},
                headers=headers,
            )
            if r.is_success:
                return f"Task {task_id} updated to status='{new_status}'"
            return f"Failed to update task: {r.status_code}"

    # ── Habit tools ───────────────────────────────────────────────────────

    @tool
    async def list_habits() -> str:
        """List the user's habits and their completion status for today."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{habit_url}/habits/", headers=headers)
            if not r.is_success:
                return f"Failed to fetch habits: {r.status_code}"
            habits = r.json()
            if not habits:
                return "No habits found."
            lines = []
            for h in habits:
                status = "✓" if h.get("completed_today") else "○"
                streak = h.get("current_streak", 0)
                lines.append(f"{status} {h['name']} (streak={streak}d, xp={h.get('xp_earned', 0)})")
            return "Habits today:\n" + "\n".join(lines)

    @tool
    async def log_habit(habit_id: str, notes: str = "") -> str:
        """Mark a habit as completed for today by its ID."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                f"{habit_url}/habits/{habit_id}/log",
                json={"notes": notes},
                headers=headers,
            )
            if r.is_success:
                data = r.json()
                return f"Habit logged! Streak={data.get('current_streak', '?')}d, XP earned={data.get('xp_earned', 0)}"
            return f"Failed to log habit: {r.status_code} — {r.text}"

    # ── Finance tools ─────────────────────────────────────────────────────

    @tool
    async def log_expense(amount: float, description: str, category: str = "Other") -> str:
        """Log a new expense. Category examples: Food, Transport, Shopping, Entertainment, Health."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                f"{finance_url}/expenses/",
                json={"amount": amount, "description": description, "category": category},
                headers=headers,
            )
            if r.is_success:
                e = r.json()
                return f"Expense logged: ₹{e['amount']} for '{e['description']}' (category={e['category']})"
            return f"Failed to log expense: {r.status_code}"

    @tool
    async def get_spending_summary() -> str:
        """Get a summary of the user's recent spending by category."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{finance_url}/expenses/summary", headers=headers)
            if not r.is_success:
                return f"Failed to fetch spending summary: {r.status_code}"
            s = r.json()
            total = s.get("total", 0)
            count = s.get("count", 0)
            by_cat = s.get("by_category", {})
            top = sorted(by_cat.items(), key=lambda x: -x[1])[:5]
            lines = [f"  {cat}: ₹{amt:.0f}" for cat, amt in top]
            return f"Spending summary:\nTotal: ₹{total:.0f} across {count} expenses\nTop categories:\n" + "\n".join(lines)

    @tool
    async def get_budget_status() -> str:
        """Get the user's budget status and how much is remaining per category."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{finance_url}/budgets/", headers=headers)
            if not r.is_success:
                return f"Failed to fetch budgets: {r.status_code}"
            budgets = r.json()
            if not budgets:
                return "No budgets set yet."
            lines = []
            for b in budgets:
                spent = b.get("spent", 0)
                limit = b["amount"]
                pct = (spent / limit * 100) if limit > 0 else 0
                status = "⚠️ Over!" if spent > limit else ("🔶 Near limit" if pct > 80 else "✅ OK")
                lines.append(f"{status} {b['category']}: ₹{spent:.0f}/₹{limit:.0f} ({pct:.0f}%)")
            return "Budget status:\n" + "\n".join(lines)

    # ── Knowledge tools ───────────────────────────────────────────────────

    @tool
    async def search_knowledge(query: str) -> str:
        """Search the user's uploaded documents and notes using semantic search."""
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.post(
                f"{rag_url}/rag/search",
                json={"query": query, "top_k": 5},
                headers=headers,
            )
            if not r.is_success:
                return f"Knowledge search failed: {r.status_code}"
            results = r.json()
            if not results:
                return "No relevant documents found for your query."
            lines = [f"- {item.get('text', '')[:200]}..." for item in results[:3]]
            return "Knowledge base results:\n" + "\n".join(lines)

    @tool
    async def answer_from_knowledge(question: str) -> str:
        """Ask a question and get an AI-synthesized answer from the user's knowledge base."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(
                f"{rag_url}/rag/ask",
                json={"question": question},
                headers=headers,
            )
            if not r.is_success:
                return f"Knowledge Q&A failed: {r.status_code}"
            data = r.json()
            return data.get("answer", "No answer found.")

    # ── Career tools ──────────────────────────────────────────────────────

    @tool
    async def get_career_suggestions() -> str:
        """Get AI-powered career suggestions and skill gap analysis for the user."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(f"{career_url}/career/insights", headers=headers)
            if r.is_success:
                data = r.json()
                return f"Career insights: {data.get('summary', 'No insights available.')}"
            return "Career service unavailable."

    return [
        create_task,
        list_tasks,
        update_task_status,
        list_habits,
        log_habit,
        log_expense,
        get_spending_summary,
        get_budget_status,
        search_knowledge,
        answer_from_knowledge,
        get_career_suggestions,
    ]
