import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { careerApi, type AnalysisRecord } from "../api";
import { colors, radius } from "../theme";

function typeLabel(type: string): string {
  return type === "resume_analysis" ? "Resume Analysis" : type === "interview_prep" ? "Interview Prep" : type;
}

function typeIcon(type: string): string {
  return type === "resume_analysis" ? "📋" : type === "interview_prep" ? "🎯" : "🧠";
}

function typeColor(type: string): string {
  return type === "resume_analysis" ? colors.primary : colors.warning;
}

function AnalysisCard({ analysis, onPress }: { analysis: AnalysisRecord; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.cardIcon, { backgroundColor: `${typeColor(analysis.type)}22` }]}>
        <Text style={{ fontSize: 20 }}>{typeIcon(analysis.type)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor(analysis.type)}22` }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor(analysis.type) }]}>
              {typeLabel(analysis.type)}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{analysis.title}</Text>
        <Text style={styles.cardDate}>
          {new Date(analysis.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ContentSection({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function AnalysisDetail({ analysis, onBack }: { analysis: AnalysisRecord; onBack: () => void }) {
  const content = analysis.content as any;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={[styles.detailHeader, { borderColor: `${typeColor(analysis.type)}40` }]}>
        <Text style={{ fontSize: 28 }}>{typeIcon(analysis.type)}</Text>
        <View>
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor(analysis.type)}22` }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor(analysis.type) }]}>
              {typeLabel(analysis.type)}
            </Text>
          </View>
          <Text style={styles.detailTitle}>{analysis.title}</Text>
          <Text style={styles.cardDate}>
            {new Date(analysis.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </View>
      </View>

      {analysis.type === "resume_analysis" && content && (
        <>
          {content.summary && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{content.summary}</Text>
            </View>
          )}
          {content.score !== undefined && (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Overall Score</Text>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{content.score}</Text>
                <Text style={styles.scoreMax}>/10</Text>
              </View>
            </View>
          )}
          <ContentSection title="✅ Strengths" items={content.strengths} />
          <ContentSection title="⚠️ Weaknesses" items={content.weaknesses} />
          <ContentSection title="🚀 Improvements" items={content.improvements} />
          <ContentSection title="🔧 Missing Skills" items={content.missing_skills} />
          <ContentSection title="💡 Recommendations" items={content.recommendations} />
        </>
      )}

      {analysis.type === "interview_prep" && content && (
        <>
          {content.role && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>Role: {content.role}</Text>
            </View>
          )}
          {content.questions?.map((q: any, i: number) => (
            <View key={i} style={styles.questionCard}>
              <Text style={styles.questionText}>Q{i + 1}. {q.question}</Text>
              <Text style={styles.answerLabel}>Sample Answer</Text>
              <Text style={styles.answerText}>{q.answer}</Text>
              {q.tip && (
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>💡 {q.tip}</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

export function CareerScreen() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnalysisRecord | null>(null);

  useEffect(() => {
    careerApi.listAnalyses()
      .then(setAnalyses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (selected) {
    return <AnalysisDetail analysis={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Career Intelligence</Text>
        <Text style={styles.heroSubtitle}>
          Upload your resume on the web app to get AI-powered analysis, skill gap detection, and personalised interview preparation.
        </Text>
        <View style={styles.featureRow}>
          {[
            { icon: "📋", label: "Resume Analysis" },
            { icon: "🎯", label: "Interview Prep" },
            { icon: "🧠", label: "Skill Gaps" },
          ].map((f) => (
            <View key={f.label} style={styles.featureChip}>
              <Text style={{ fontSize: 16 }}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {analyses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No analyses yet</Text>
          <Text style={styles.emptyText}>
            Go to yourbestpeer.app → Career to upload your resume and run an analysis.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.listTitle}>Your Analyses ({analyses.length})</Text>
          {analyses.map((a) => (
            <AnalysisCard key={a.id} analysis={a} onPress={() => setSelected(a)} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  heroCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 20 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: colors.muted, lineHeight: 20, marginBottom: 16 },
  featureRow: { flexDirection: "row", gap: 8 },
  featureChip: { flex: 1, alignItems: "center", gap: 6, padding: 12, backgroundColor: `${colors.primary}11`, borderRadius: radius.md },
  featureLabel: { fontSize: 11, fontWeight: "600", color: colors.primaryLight, textAlign: "center" },
  listTitle: { fontSize: 15, fontWeight: "700", color: colors.muted, marginBottom: 12 },
  card: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  cardIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cardHeaderRow: { marginBottom: 4 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.text, lineHeight: 20 },
  cardDate: { fontSize: 11, color: colors.muted, marginTop: 4 },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 20 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  detailHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 16, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, marginBottom: 20 },
  detailTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 4, maxWidth: 260 },
  summaryBox: { backgroundColor: `${colors.primary}11`, borderRadius: radius.md, padding: 14, marginBottom: 16 },
  summaryText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: colors.card, borderRadius: radius.md, marginBottom: 16 },
  scoreLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  scoreCircle: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  scoreValue: { fontSize: 32, fontWeight: "700", color: colors.primary },
  scoreMax: { fontSize: 16, color: colors.muted },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  bullet: { flexDirection: "row", gap: 8, marginBottom: 6 },
  bulletDot: { fontSize: 14, color: colors.primary, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 20 },
  questionCard: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  questionText: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 10 },
  answerLabel: { fontSize: 11, fontWeight: "700", color: colors.primary, marginBottom: 6 },
  answerText: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  tipBox: { marginTop: 10, backgroundColor: `${colors.warning}11`, borderRadius: radius.sm, padding: 10 },
  tipText: { fontSize: 12, color: colors.warning, lineHeight: 18 },
});
