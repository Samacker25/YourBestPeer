import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { financeApi, type Expense, type Budget, type ExpenseSummary } from "../api";
import { colors, radius } from "../theme";

const CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Health", "Bills", "Education", "Other"];

function CategoryBadge({ cat }: { cat: string }) {
  const palette: Record<string, string> = {
    Food: "#f97316", Transport: "#3b82f6", Shopping: "#a855f7",
    Entertainment: "#ec4899", Health: "#10b981", Bills: "#f59e0b",
    Education: "#06b6d4", Other: "#6b7280",
  };
  return (
    <View style={[styles.badge, { backgroundColor: (palette[cat] ?? "#6b7280") + "22" }]}>
      <Text style={[styles.badgeText, { color: palette[cat] ?? "#6b7280" }]}>{cat}</Text>
    </View>
  );
}

export function FinanceScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"expenses" | "budgets">("expenses");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "", category: "Food" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [exp, bud, sum] = await Promise.all([
        financeApi.listExpenses(30),
        financeApi.listBudgets(),
        financeApi.summary(),
      ]);
      setExpenses(exp);
      setBudgets(bud);
      setSummary(sum);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    const amt = parseFloat(form.amount);
    if (!amt || !form.description) return Alert.alert("Fill all fields");
    setSaving(true);
    try {
      await financeApi.createExpense({ amount: amt, description: form.description, category: form.category });
      setForm({ amount: "", description: "", category: "Food" });
      setShowAdd(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setSaving(false);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Spent</Text>
        <Text style={styles.summaryAmount}>₹{(summary?.total ?? 0).toLocaleString("en-IN")}</Text>
        <Text style={styles.summaryCount}>{summary?.count ?? 0} transactions</Text>
        {summary?.by_category && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {Object.entries(summary.by_category)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([cat, amt]) => (
                <View key={cat} style={styles.catChip}>
                  <Text style={styles.catChipLabel}>{cat}</Text>
                  <Text style={styles.catChipAmt}>₹{Math.round(amt).toLocaleString("en-IN")}</Text>
                </View>
              ))}
          </ScrollView>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["expenses", "budgets"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "expenses" ? "Expenses" : "Budgets"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {tab === "expenses" ? (
          expenses.length === 0 ? (
            <Text style={styles.empty}>No expenses yet</Text>
          ) : (
            expenses.map((e) => (
              <View key={e.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{e.description}</Text>
                  <Text style={styles.rowSub}>{new Date(e.created_at).toLocaleDateString("en-IN")}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={styles.amount}>₹{e.amount.toLocaleString("en-IN")}</Text>
                  <CategoryBadge cat={e.category} />
                </View>
              </View>
            ))
          )
        ) : (
          budgets.length === 0 ? (
            <Text style={styles.empty}>No budgets set</Text>
          ) : (
            budgets.map((b) => {
              const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
              const over = b.spent > b.amount;
              return (
                <View key={b.id} style={styles.row}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.rowTitle}>{b.category}</Text>
                      <Text style={[styles.amount, over && { color: colors.danger }]}>
                        ₹{b.spent.toLocaleString("en-IN")} / ₹{b.amount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: over ? colors.danger : colors.primary }]} />
                    </View>
                    {over && <Text style={{ color: colors.danger, fontSize: 11 }}>⚠ Over budget by ₹{(b.spent - b.amount).toFixed(0)}</Text>}
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+ Add Expense</Text>
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Log Expense</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor={colors.muted}
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catBtn, form.category === c && styles.catBtnActive]}
                  onPress={() => setForm({ ...form, category: c })}
                >
                  <Text style={[styles.catBtnText, form.category === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btn} onPress={handleAdd} disabled={saving}>
              <Text style={styles.btnText}>{saving ? "Saving…" : "Log Expense"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowAdd(false)}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  summaryCard: { margin: 16, padding: 20, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  summaryLabel: { fontSize: 12, color: colors.muted, fontWeight: "600", letterSpacing: 0.5 },
  summaryAmount: { fontSize: 36, fontWeight: "700", color: colors.text, marginTop: 4 },
  summaryCount: { fontSize: 13, color: colors.muted, marginTop: 2 },
  catChip: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.border, borderRadius: 20 },
  catChipLabel: { fontSize: 11, color: colors.muted },
  catChipAmt: { fontSize: 12, fontWeight: "600", color: colors.text },
  tabs: { flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", margin: 16, marginBottom: 0, padding: 14, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "700", color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  progressBg: { height: 6, backgroundColor: colors.border, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, fontSize: 14 },
  fab: { position: "absolute", bottom: 24, right: 24, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.xl },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, color: colors.text, fontSize: 14, marginBottom: 12 },
  catBtn: { marginRight: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.border, borderRadius: 20 },
  catBtnActive: { backgroundColor: colors.primary },
  catBtnText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  btn: { backgroundColor: colors.primary, padding: 16, borderRadius: radius.md, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnSecondary: { padding: 16, borderRadius: radius.md, alignItems: "center", marginTop: 8 },
  btnSecondaryText: { color: colors.muted, fontWeight: "600", fontSize: 14 },
});
