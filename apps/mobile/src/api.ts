import * as SecureStore from "expo-secure-store";

const BASE_URLS = {
  auth: process.env.EXPO_PUBLIC_AUTH_URL ?? "http://localhost:8001",
  productivity: process.env.EXPO_PUBLIC_PRODUCTIVITY_URL ?? "http://localhost:8003",
  habit: process.env.EXPO_PUBLIC_HABIT_URL ?? "http://localhost:8005",
  agent: process.env.EXPO_PUBLIC_AGENT_URL ?? "http://localhost:8002",
  finance: process.env.EXPO_PUBLIC_FINANCE_URL ?? "http://localhost:8004",
  rag: process.env.EXPO_PUBLIC_RAG_URL ?? "http://localhost:8009",
  career: process.env.EXPO_PUBLIC_CAREER_URL ?? "http://localhost:8010",
};

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("access_token");
}

export async function apiRequest<T>(
  service: keyof typeof BASE_URLS,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URLS[service]}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; name: string; email: string; avatar_url: string | null };
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>("auth", "/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiRequest<LoginResponse["user"]>("auth", "/auth/me"),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
}

export const tasksApi = {
  list: () => apiRequest<Task[]>("productivity", "/tasks/"),
  create: (data: { title: string; priority?: string }) =>
    apiRequest<Task>("productivity", "/tasks/", { method: "POST", body: JSON.stringify(data) }),
  complete: (id: string) =>
    apiRequest<Task>("productivity", `/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
    }),
  delete: (id: string) =>
    apiRequest<void>("productivity", `/tasks/${id}`, { method: "DELETE" }),
};

// ─── Habits ───────────────────────────────────────────────────────────────────
export interface Habit {
  id: string;
  name: string;
  frequency: string;
  current_streak: number;
  completed_today: boolean;
  xp_earned: number;
}

export const habitsApi = {
  list: () => apiRequest<Habit[]>("habit", "/habits/"),
  logToday: (id: string) =>
    apiRequest<{ message: string; xp_earned: number; current_streak: number }>(
      "habit", `/habits/${id}/log`, { method: "POST", body: JSON.stringify({}) }
    ),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (message: string, conversation_id?: string) =>
    apiRequest<{ reply: string; conversation_id: string }>("agent", "/chat/", {
      method: "POST",
      body: JSON.stringify({ message, conversation_id }),
    }),
};

// ─── Finance ──────────────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
}

export interface ExpenseSummary {
  total: number;
  count: number;
  by_category: Record<string, number>;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
}

export const financeApi = {
  listExpenses: (limit = 20) =>
    apiRequest<Expense[]>("finance", `/expenses/?limit=${limit}`),
  createExpense: (data: { amount: number; description: string; category: string }) =>
    apiRequest<Expense>("finance", "/expenses/", { method: "POST", body: JSON.stringify(data) }),
  summary: () => apiRequest<ExpenseSummary>("finance", "/expenses/summary"),
  listBudgets: () => apiRequest<Budget[]>("finance", "/budgets/"),
};

// ─── Notes ────────────────────────────────────────────────────────────────────
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const notesApi = {
  list: () => apiRequest<Note[]>("productivity", "/notes/"),
  create: (data: { title: string; content?: string; tags?: string[] }) =>
    apiRequest<Note>("productivity", "/notes/", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiRequest<void>("productivity", `/notes/${id}`, { method: "DELETE" }),
};

// ─── Knowledge / RAG ──────────────────────────────────────────────────────────
export interface RagDocument {
  id: string;
  filename: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

export interface RagSearchResult {
  answer: string;
  sources: { text: string; document_id: string; score: number }[];
}

export const ragApi = {
  list: () => apiRequest<RagDocument[]>("rag", "/documents/"),
  search: (query: string) =>
    apiRequest<RagSearchResult>("rag", "/documents/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
};

// ─── Career ───────────────────────────────────────────────────────────────────
export interface AnalysisRecord {
  id: string;
  type: string;
  title: string;
  content: unknown;
  created_at: string;
}

export const careerApi = {
  listAnalyses: () => apiRequest<AnalysisRecord[]>("career", "/career/analyses"),
};
