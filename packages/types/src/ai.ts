export type AgentName =
  | "coordinator"
  | "productivity"
  | "finance"
  | "knowledge"
  | "career"
  | "habit";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  agentUsed?: AgentName;
  toolCalls?: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
