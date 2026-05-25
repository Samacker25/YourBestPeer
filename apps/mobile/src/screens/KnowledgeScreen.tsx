import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ragApi, type RagDocument, type RagSearchResult } from "../api";
import { colors, radius } from "../theme";
import { useEffect } from "react";

export function KnowledgeScreen() {
  const [docs, setDocs] = useState<RagDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<RagSearchResult | null>(null);
  const [tab, setTab] = useState<"search" | "docs">("search");

  useEffect(() => {
    ragApi.list().then(setDocs).catch(() => {}).finally(() => setLoadingDocs(false));
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const res = await ragApi.search(query.trim());
      setResult(res);
    } catch (e: any) {
      setResult({ answer: `Error: ${e.message}`, sources: [] });
    }
    setSearching(false);
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(["search", "docs"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "search" ? "Ask AI" : "Documents"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "search" ? (
        <ScrollView contentContainerStyle={styles.searchContainer}>
          <Text style={styles.sectionTitle}>Ask your knowledge base</Text>
          <Text style={styles.hint}>
            Ask any question and the AI will search your uploaded documents for the answer.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.queryInput}
              placeholder="What is the main idea of…?"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              multiline
            />
            <TouchableOpacity
              style={[styles.searchBtn, (!query.trim() || searching) && { opacity: 0.5 }]}
              onPress={handleSearch}
              disabled={!query.trim() || searching}
            >
              {searching
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.searchBtnText}>Ask</Text>
              }
            </TouchableOpacity>
          </View>

          {result && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultLabel}>AI Answer</Text>
              </View>
              <Text style={styles.resultAnswer}>{result.answer}</Text>
              {result.sources.length > 0 && (
                <>
                  <Text style={styles.sourcesLabel}>Sources ({result.sources.length})</Text>
                  {result.sources.map((s, i) => (
                    <View key={i} style={styles.sourceItem}>
                      <Text style={styles.sourceText} numberOfLines={3}>{s.text}</Text>
                      <Text style={styles.sourceScore}>Relevance: {(s.score * 100).toFixed(0)}%</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {!result && !searching && (
            <View style={styles.examplesCard}>
              <Text style={styles.examplesTitle}>Example questions</Text>
              {[
                "Summarise my notes on machine learning",
                "What are the key points from the project proposal?",
                "What did I write about financial planning?",
              ].map((q) => (
                <TouchableOpacity key={q} style={styles.exampleChip} onPress={() => setQuery(q)}>
                  <Text style={styles.exampleText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {loadingDocs ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : docs.length === 0 ? (
            <View style={styles.emptyDocs}>
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptyHint}>Upload documents from the web app to start asking questions.</Text>
            </View>
          ) : (
            docs.map((doc) => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docIcon}>
                  <Text style={{ fontSize: 20 }}>
                    {doc.filename.endsWith(".pdf") ? "📄" : doc.filename.endsWith(".docx") ? "📝" : "📃"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.filename}</Text>
                  <Text style={styles.docMeta}>
                    {doc.chunk_count} chunks · {new Date(doc.created_at).toLocaleDateString("en-IN")}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: doc.status === "ready" ? `${colors.success}22` : `${colors.warning}22` }]}>
                    <Text style={[styles.statusText, { color: doc.status === "ready" ? colors.success : colors.warning }]}>
                      {doc.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: "row", margin: 16, marginBottom: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  searchContainer: { padding: 16, paddingBottom: 60 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 6 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 20, lineHeight: 18 },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", marginBottom: 20 },
  queryInput: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, color: colors.text, fontSize: 14, minHeight: 52, textAlignVertical: "top" },
  searchBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 16, borderRadius: radius.md },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  resultCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: `${colors.primary}40`, padding: 16 },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  resultLabel: { fontSize: 12, fontWeight: "700", color: colors.primary, letterSpacing: 0.5 },
  resultAnswer: { fontSize: 14, color: colors.text, lineHeight: 22 },
  sourcesLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, marginTop: 16, marginBottom: 8 },
  sourceItem: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 10, marginBottom: 8 },
  sourceText: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  sourceScore: { fontSize: 11, color: colors.primary, marginTop: 4 },
  examplesCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  examplesTitle: { fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 12 },
  exampleChip: { padding: 12, backgroundColor: colors.bg, borderRadius: radius.md, marginBottom: 8 },
  exampleText: { fontSize: 13, color: colors.text },
  emptyDocs: { alignItems: "center", marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 },
  emptyHint: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  docCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  docIcon: { width: 44, height: 44, backgroundColor: `${colors.primary}22`, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 14, fontWeight: "600", color: colors.text },
  docMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  statusBadge: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "700" },
});
