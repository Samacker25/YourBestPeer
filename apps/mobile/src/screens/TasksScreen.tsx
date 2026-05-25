import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { tasksApi, type Task } from "../api";
import { colors, radius } from "../theme";

const PRIORITY_COLOR: Record<string, string> = {
  high: colors.danger,
  medium: colors.warning,
  low: colors.muted,
};

export function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    tasksApi.list()
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      const task = await tasksApi.create({ title });
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
    } catch {
      Alert.alert("Error", "Failed to create task");
    } finally {
      setAdding(false);
    }
  }

  async function handleComplete(task: Task) {
    if (task.status === "done") return;
    const updated = await tasksApi.complete(task.id).catch(() => null);
    if (updated) setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  const todo = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a task…"
          placeholderTextColor={colors.muted}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, adding && styles.disabled]}
          onPress={handleAdd}
          disabled={adding}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...todo, ...done]}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.taskRow}
            onPress={() => handleComplete(item)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              item.status === "done" && styles.checkboxDone,
            ]}>
              {item.status === "done" && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.taskTitle, item.status === "done" && styles.taskDone]}>
              {item.title}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: (PRIORITY_COLOR[item.priority] ?? colors.muted) + "22" }]}>
              <Text style={[styles.priorityText, { color: PRIORITY_COLOR[item.priority] ?? colors.muted }]}>
                {item.priority}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tasks yet. Add one above!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  inputRow: { flexDirection: "row", gap: 10, padding: 16 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 14,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  addBtnText: { color: "#fff", fontSize: 22, fontWeight: "300", marginTop: -2 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  taskTitle: { flex: 1, color: colors.text, fontSize: 14 },
  taskDone: { color: colors.muted, textDecorationLine: "line-through" },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText: { fontSize: 11, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: colors.muted, fontSize: 14 },
});
