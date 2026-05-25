import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { habitsApi, type Habit } from "../api";
import { colors, radius } from "../theme";

export function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<string | null>(null);

  useEffect(() => {
    habitsApi.list()
      .then(setHabits)
      .catch(() => setHabits([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleLog(habit: Habit) {
    if (habit.completed_today || logging) return;
    setLogging(habit.id);
    try {
      await habitsApi.logToday(habit.id);
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, completed_today: true, streak: h.streak + 1 } : h))
      );
    } catch {
    } finally {
      setLogging(null);
    }
  }

  const completed = habits.filter((h) => h.completed_today).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${habits.length ? (completed / habits.length) * 100 : 0}%` as `${number}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{completed} / {habits.length} completed today</Text>

      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.habitCard, item.completed_today && styles.habitDone]}
            onPress={() => handleLog(item)}
            disabled={item.completed_today || logging === item.id}
            activeOpacity={0.75}
          >
            <View style={styles.habitLeft}>
              <View style={[styles.habitCheck, item.completed_today && styles.habitCheckDone]}>
                {item.completed_today && <Text style={styles.habitCheckMark}>✓</Text>}
              </View>
              <View>
                <Text style={[styles.habitName, item.completed_today && styles.habitNameDone]}>
                  {item.name}
                </Text>
                <Text style={styles.habitFreq}>{item.frequency}</Text>
              </View>
            </View>
            {item.streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {item.streak}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No habits yet. Create some in the web app!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.success, borderRadius: 2 },
  progressLabel: { color: colors.muted, fontSize: 12, marginHorizontal: 16, marginTop: 6, marginBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitDone: { borderColor: colors.success + "44", backgroundColor: colors.success + "0a" },
  habitLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  habitCheck: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  habitCheckDone: { backgroundColor: colors.success, borderColor: colors.success },
  habitCheckMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  habitName: { color: colors.text, fontSize: 15, fontWeight: "500" },
  habitNameDone: { color: colors.muted, textDecorationLine: "line-through" },
  habitFreq: { color: colors.muted, fontSize: 12, marginTop: 1 },
  streakBadge: {
    backgroundColor: colors.warning + "22",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakText: { color: colors.warning, fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center" },
});
