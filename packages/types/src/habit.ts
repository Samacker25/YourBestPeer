export type HabitFrequency = "daily" | "weekly" | "custom";

export interface Habit {
  id: string;
  userId: string;
  name: string;
  frequency: HabitFrequency;
  targetCount: number;
  icon: string;
  color: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  completedAt: string;
  value?: number;
  note?: string;
}

export interface Streak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedAt?: string;
}
