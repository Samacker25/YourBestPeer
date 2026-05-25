export type ExpenseCategory =
  | "food"
  | "transport"
  | "entertainment"
  | "health"
  | "education"
  | "shopping"
  | "bills"
  | "savings"
  | "other";

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  date: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: ExpenseCategory;
  monthlyLimit: number;
  month: string; // "YYYY-MM"
  spent: number;
}
