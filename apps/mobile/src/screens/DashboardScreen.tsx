import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { authApi, tasksApi, habitsApi, type Task, type Habit } from "../api";
import { colors, radius } from "../theme";

interface Props {
  onLogout: () => void;
}

export function DashboardScreen({ onLogout }: Props) {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([authApi.me(), tasksApi.list(), habitsApi.list()])
      .then(([u, t, h]) => {
        setUser(u);
        setTasks(t.filter((x) => x.status !== "done").slice(0, 3));
        setHabits(h.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    onLogout();
  }

  const todayStr = new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const doneHabits = habits.filter((h) => h.completed_today).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day, {user?.name?.split(" ")[0] ?? "there"} 👋</Text>
          <Text style={styles.date}>{todayStr}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Tasks pending" value={tasks.length.toString()} color={colors.warning} />
        <StatCard label="Habits today" value={`${doneHabits}/${habits.length}`} color={colors.success} />
      </View>

      {/* Upcoming tasks */}
      <SectionHeader title="Upcoming tasks" />
      {tasks.length === 0 ? (
        <EmptyCard text="No pending tasks — great work!" />
      ) : (
        tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))
      )}

      {/* Today's habits */}
      <SectionHeader title="Today's habits" />
      {habits.length === 0 ? (
        <EmptyCard text="No habits set up yet." />
      ) : (
        habits.map((h) => (
          <HabitRow key={h.id} habit={h} />
        ))
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + "33" }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function TaskRow({ task }: { task: Task }) {
  const priorityColor = task.priority === "high" ? colors.danger : task.priority === "medium" ? colors.warning : colors.muted;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: priorityColor }]} />
      <Text style={styles.rowText} numberOfLines={1}>{task.title}</Text>
    </View>
  );
}

function HabitRow({ habit }: { habit: Habit }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: habit.completed_today ? colors.success : colors.muted }]} />
      <Text style={styles.rowText} numberOfLines={1}>{habit.name}</Text>
      {habit.streak > 0 && (
        <Text style={styles.streak}>🔥 {habit.streak}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { color: colors.text, fontSize: 20, fontWeight: "700" },
  date: { color: colors.muted, fontSize: 13, marginTop: 2 },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  logoutText: { color: colors.muted, fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, padding: 16 },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, marginBottom: 8 },
  emptyText: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  rowText: { flex: 1, color: colors.text, fontSize: 14 },
  streak: { color: colors.warning, fontSize: 12 },
});
