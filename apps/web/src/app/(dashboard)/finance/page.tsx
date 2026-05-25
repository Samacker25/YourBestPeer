"use client";

import { useEffect, useRef, useState } from "react";
import { financeApi, budgetsApi, type Expense, type ExpenseSummary, type Budget, type ScanResult, type ScannedItem } from "@/lib/api";
import { useToast } from "@/components/Toast";

const CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Entertainment", "Utilities", "Other"];

const CATEGORY_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  Food:          { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", dot: "bg-orange-400" },
  Transport:     { color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",     dot: "bg-blue-400" },
  Shopping:      { color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20",     dot: "bg-pink-400" },
  Health:        { color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20",dot: "bg-emerald-400" },
  Entertainment: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", dot: "bg-purple-400" },
  Utilities:     { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", dot: "bg-yellow-400" },
  Other:         { color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20",   dot: "bg-slate-400" },
};

function cat(c: string) { return CATEGORY_STYLE[c] ?? CATEGORY_STYLE.Other; }

type Tab = "expenses" | "budgets" | "scan";

export default function FinancePage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenseForm, setExpenseForm] = useState({
    amount: "", category: "Food", description: "", date: new Date().toISOString().split("T")[0],
  });
  const [aiSuggested, setAiSuggested] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const categorizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [budgetForm, setBudgetForm] = useState({ category: "Food", limit_amount: "", period: "monthly" });
  const [creating, setCreating] = useState(false);
  const [expensePage, setExpensePage] = useState(0);
  const EXPENSE_PAGE_SIZE = 10;

  // Receipt scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanItems, setScanItems] = useState<ScannedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [exps, sum, bud] = await Promise.all([
        financeApi.listExpenses(), financeApi.summary(), budgetsApi.list(),
      ]);
      setExpenses(exps);
      setSummary(sum);
      setBudgets(bud);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseForm.amount) return;
    setCreating(true);
    try {
      const exp = await financeApi.createExpense({
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description || undefined,
        date: expenseForm.date,
      });
      setExpenses((p) => [exp, ...p]);
      setSummary((s) => s ? {
        ...s, total: s.total + exp.amount, count: s.count + 1,
        by_category: { ...s.by_category, [exp.category]: (s.by_category[exp.category] || 0) + exp.amount },
      } : s);
      setExpenseForm((f) => ({ ...f, amount: "", description: "" }));
    } finally { setCreating(false); }
  }

  async function createBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!budgetForm.limit_amount) return;
    setCreating(true);
    try {
      const b = await budgetsApi.create({
        category: budgetForm.category,
        limit_amount: parseFloat(budgetForm.limit_amount),
        period: budgetForm.period,
      });
      setBudgets((p) => [...p, b]);
      setBudgetForm((f) => ({ ...f, limit_amount: "" }));
    } finally { setCreating(false); }
  }

  async function deleteExpense(id: string) {
    await financeApi.deleteExpense(id);
    setExpenses((p) => p.filter((e) => e.id !== id));
    load();
  }

  async function deleteBudget(id: string) {
    await budgetsApi.delete(id);
    setBudgets((p) => p.filter((b) => b.id !== id));
  }

  async function handleScan(file: File) {
    setScanning(true);
    setScanResult(null);
    setScanItems([]);
    try {
      const result = await financeApi.scanReceipt(file);
      setScanResult(result);
      setScanItems(result.items);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to scan receipt", "error");
    } finally {
      setScanning(false);
    }
  }

  async function saveScannedExpenses() {
    if (!scanItems.length || !scanResult) return;
    setSaving(true);
    try {
      await Promise.all(
        scanItems.map((item) =>
          financeApi.createExpense({
            amount: item.amount,
            category: item.category,
            description: item.description,
            date: scanResult.date,
          })
        )
      );
      toast(`${scanItems.length} expense${scanItems.length > 1 ? "s" : ""} saved`);
      setScanResult(null);
      setScanItems([]);
      load();
      setTab("expenses");
    } catch {
      toast("Failed to save some expenses", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track expenses and manage budgets</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-card p-5">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="mt-2 text-2xl font-bold text-violet-400">₹{summary.total.toFixed(2)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{summary.count} transactions</p>
          </div>
          {Object.entries(summary.by_category).sort(([, a], [, b]) => b - a).slice(0, 3).map(([c, amount]) => {
            const s = cat(c);
            return (
              <div key={c} className={`rounded-2xl border p-5 ${s.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <p className="text-xs text-muted-foreground">{c}</p>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>₹{amount.toFixed(0)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {(["expenses", "budgets", "scan"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "scan" && (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            )}
            {t === "scan" ? "Scan Receipt" : t}
          </button>
        ))}
      </div>

      {tab === "expenses" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Add expense */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold text-foreground flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Expense
            </h2>
            <form onSubmit={createExpense} className="space-y-3.5">
              <Field label="Amount (₹)">
                <input type="number" step="0.01" required placeholder="0.00"
                  value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  className={INPUT} />
              </Field>
              <Field label={
                <span className="flex items-center gap-1.5">
                  Category
                  {categorizing
                    ? <span className="text-[10px] text-primary animate-pulse">AI…</span>
                    : aiSuggested
                      ? <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary">AI</span>
                      : null
                  }
                </span>
              }>
                <select
                  value={expenseForm.category}
                  onChange={(e) => { setExpenseForm((f) => ({ ...f, category: e.target.value })); setAiSuggested(false); }}
                  className={INPUT}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Description">
                <input
                  type="text"
                  placeholder="Optional note"
                  value={expenseForm.description}
                  onChange={(e) => {
                    const desc = e.target.value;
                    setExpenseForm((f) => ({ ...f, description: desc }));
                    setAiSuggested(false);
                    if (categorizeTimer.current) clearTimeout(categorizeTimer.current);
                    if (desc.trim().length > 2) {
                      categorizeTimer.current = setTimeout(async () => {
                        setCategorizing(true);
                        try {
                          const res = await financeApi.categorizeExpense(desc, expenseForm.amount ? parseFloat(expenseForm.amount) : undefined);
                          if (res.confidence !== "low") {
                            setExpenseForm((f) => ({ ...f, category: res.category }));
                            setAiSuggested(true);
                          }
                        } finally {
                          setCategorizing(false);
                        }
                      }, 500);
                    }
                  }}
                  className={INPUT}
                />
              </Field>
              <Field label="Date">
                <input type="date" required value={expenseForm.date}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} className={INPUT} />
              </Field>
              <button type="submit" disabled={creating} className={BTN}>
                {creating ? "Adding…" : "Add Expense"}
              </button>
            </form>
          </div>

          {/* Expense list */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="font-semibold text-foreground">Recent Expenses</h2>
              <span className="text-xs text-muted-foreground">{expenses.length} total</span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">{[0,1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="text-3xl mb-3">₹</div>
                <p className="font-medium text-foreground">No expenses yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first expense to start tracking.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {expenses.slice(expensePage * EXPENSE_PAGE_SIZE, (expensePage + 1) * EXPENSE_PAGE_SIZE).map((exp) => {
                    const s = cat(exp.category);
                    return (
                      <div key={exp.id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${s.bg} ${s.color}`}>
                          {exp.category[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{exp.description || exp.category}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className={`font-medium ${s.color}`}>{exp.category}</span> · {exp.date}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-foreground">₹{Number(exp.amount).toFixed(2)}</p>
                        <button onClick={() => deleteExpense(exp.id)} className="hidden rounded-lg p-1 text-red-400 hover:bg-red-500/10 group-hover:block transition">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {expenses.length > EXPENSE_PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t border-border px-5 py-3">
                    <span className="text-xs text-muted-foreground">
                      {expensePage * EXPENSE_PAGE_SIZE + 1}–{Math.min((expensePage + 1) * EXPENSE_PAGE_SIZE, expenses.length)} of {expenses.length}
                    </span>
                    <div className="flex gap-1">
                      <button
                        disabled={expensePage === 0}
                        onClick={() => setExpensePage((p) => p - 1)}
                        className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40 transition"
                      >
                        ← Prev
                      </button>
                      <button
                        disabled={(expensePage + 1) * EXPENSE_PAGE_SIZE >= expenses.length}
                        onClick={() => setExpensePage((p) => p + 1)}
                        className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40 transition"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : tab === "budgets" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Add budget */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold text-foreground flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Set Budget
            </h2>
            <form onSubmit={createBudget} className="space-y-3.5">
              <Field label="Category">
                <select value={budgetForm.category} onChange={(e) => setBudgetForm((f) => ({ ...f, category: e.target.value }))} className={INPUT}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Limit (₹)">
                <input type="number" step="0.01" required placeholder="5000"
                  value={budgetForm.limit_amount} onChange={(e) => setBudgetForm((f) => ({ ...f, limit_amount: e.target.value }))}
                  className={INPUT} />
              </Field>
              <Field label="Period">
                <select value={budgetForm.period} onChange={(e) => setBudgetForm((f) => ({ ...f, period: e.target.value }))} className={INPUT}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </Field>
              <button type="submit" disabled={creating} className={BTN}>
                {creating ? "Saving…" : "Set Budget"}
              </button>
            </form>
          </div>

          {/* Budget list */}
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              [0,1,2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)
            ) : budgets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-16 text-center">
                <p className="font-medium text-foreground">No budgets set</p>
                <p className="text-sm text-muted-foreground mt-1">Set spending limits to stay on track.</p>
              </div>
            ) : (
              budgets.map((b) => {
                const s = cat(b.category);
                const pct = b.limit_amount > 0 ? Math.min((b.spent / b.limit_amount) * 100, 100) : 0;
                const over = b.spent > b.limit_amount;
                return (
                  <div key={b.id} className="group rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                        <div>
                          <p className="font-semibold text-foreground">{b.category}</p>
                          <p className="text-xs text-muted-foreground capitalize">{b.period}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${over ? "text-red-400" : s.color}`}>
                            ₹{b.spent.toFixed(0)} <span className="text-muted-foreground font-normal">/ ₹{b.limit_amount.toFixed(0)}</span>
                          </p>
                          <p className={`text-xs ${over ? "text-red-400" : "text-muted-foreground"}`}>
                            {over ? `₹${(b.spent - b.limit_amount).toFixed(0)} over budget` : `₹${b.remaining.toFixed(0)} remaining`}
                          </p>
                        </div>
                        <button onClick={() => deleteBudget(b.id)} className="hidden rounded-lg p-1 text-red-400 hover:bg-red-500/10 group-hover:block transition">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : `bg-gradient-to-r from-${s.dot.replace("bg-","")} to-${s.dot.replace("bg-","")}`}`}
                        style={{ width: `${pct}%`, background: over ? undefined : `hsl(var(--primary))` }}
                      />
                    </div>
                    <p className="mt-1.5 text-right text-xs text-muted-foreground">{pct.toFixed(0)}% used</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ── Scan Receipt ── */
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Upload zone */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              Scan Receipt with AI
            </h2>
            <p className="text-xs text-muted-foreground -mt-2">
              Upload a photo of any receipt, bill, or invoice. Gemini Vision will extract all items automatically.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleScan(f); }}
              onClick={() => receiptInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
              }`}
            >
              {scanning ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <p className="text-sm font-medium text-foreground">AI is reading your receipt…</p>
                  <p className="text-xs text-muted-foreground">This takes a few seconds</p>
                </div>
              ) : (
                <>
                  <svg className={`h-10 w-10 mb-3 ${dragOver ? "text-primary" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm font-medium text-foreground">Drop receipt image here</p>
                  <p className="mt-1 text-xs text-muted-foreground">or click to browse · JPEG, PNG, WebP · max 5 MB</p>
                </>
              )}
            </div>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = ""; }}
            />
          </div>

          {/* Results panel */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="font-semibold text-foreground">Extracted Items</h2>
              {scanResult && (
                <div className="text-xs text-muted-foreground">
                  {scanResult.merchant && <span className="font-medium text-foreground mr-2">{scanResult.merchant}</span>}
                  {scanResult.date}
                </div>
              )}
            </div>

            {!scanResult ? (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center px-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Upload a receipt to see extracted items here</p>
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto divide-y divide-border">
                  {scanItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${cat(item.category).bg} ${cat(item.category).color}`}>
                        {item.category[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          value={item.description}
                          onChange={(e) => setScanItems((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                          className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                        />
                        <select
                          value={item.category}
                          onChange={(e) => setScanItems((p) => p.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}
                          className="bg-transparent text-xs text-muted-foreground focus:outline-none mt-0.5"
                        >
                          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => setScanItems((p) => p.map((x, j) => j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                          className="w-20 bg-transparent text-sm font-bold text-right text-foreground focus:outline-none"
                        />
                        <button
                          onClick={() => setScanItems((p) => p.filter((_, j) => j !== i))}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-5 py-3.5 flex items-center justify-between bg-muted/20">
                  <div>
                    <p className="text-xs text-muted-foreground">{scanItems.length} items</p>
                    <p className="text-sm font-bold text-foreground">
                      Total: ₹{scanItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setScanResult(null); setScanItems([]); }}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition"
                    >
                      Discard
                    </button>
                    <button
                      onClick={saveScannedExpenses}
                      disabled={saving || scanItems.length === 0}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition shadow-md shadow-primary/20"
                    >
                      {saving ? "Saving…" : `Save ${scanItems.length} expense${scanItems.length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition";
const BTN = "w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition shadow-md shadow-primary/20";

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
