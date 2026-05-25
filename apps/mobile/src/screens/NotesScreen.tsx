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
import { notesApi, type Note } from "../api";
import { colors, radius } from "../theme";

export function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await notesApi.list();
      setNotes(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.title) return Alert.alert("Title is required");
    setSaving(true);
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      await notesApi.create({ title: form.title, content: form.content, tags });
      setForm({ title: "", content: "", tags: "" });
      setShowAdd(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("Delete Note", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await notesApi.delete(id);
            setSelected(null);
            load();
          } catch {}
        },
      },
    ]);
  }

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search notes…"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>{search ? "No matching notes" : "No notes yet. Create one!"}</Text>
        ) : (
          filtered.map((note) => (
            <TouchableOpacity key={note.id} style={styles.card} onPress={() => setSelected(note)}>
              <Text style={styles.noteTitle}>{note.title}</Text>
              {note.content ? (
                <Text style={styles.notePreview} numberOfLines={2}>{note.content}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {note.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.noteMeta}>{new Date(note.updated_at).toLocaleDateString("en-IN")}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+ New Note</Text>
      </TouchableOpacity>

      {/* Add Note Modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Note</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor={colors.muted}
              value={form.title}
              onChangeText={(v) => setForm({ ...form, title: v })}
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Content (optional)"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={5}
              value={form.content}
              onChangeText={(v) => setForm({ ...form, content: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Tags (comma-separated)"
              placeholderTextColor={colors.muted}
              value={form.tags}
              onChangeText={(v) => setForm({ ...form, tags: v })}
            />
            <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={saving}>
              <Text style={styles.btnText}>{saving ? "Saving…" : "Create Note"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setShowAdd(false)}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* View Note Modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: "80%" }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>{selected?.title}</Text>
              {selected?.content ? (
                <Text style={styles.noteContent}>{selected.content}</Text>
              ) : (
                <Text style={styles.empty}>No content</Text>
              )}
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {selected?.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.danger, marginTop: 16 }]}
              onPress={() => selected && handleDelete(selected.id)}
            >
              <Text style={styles.btnText}>Delete Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setSelected(null)}>
              <Text style={styles.btnCancelText}>Close</Text>
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
  search: { margin: 16, marginBottom: 8, padding: 12, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 14 },
  card: { margin: 16, marginBottom: 0, padding: 16, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  noteTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  notePreview: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  noteMeta: { fontSize: 11, color: colors.muted, marginTop: 8 },
  noteContent: { fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 8 },
  tag: { backgroundColor: `${colors.primary}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  tagText: { fontSize: 11, color: colors.primaryLight, fontWeight: "600" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, fontSize: 14 },
  fab: { position: "absolute", bottom: 24, right: 24, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.xl },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, color: colors.text, fontSize: 14, marginBottom: 12 },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  btn: { backgroundColor: colors.primary, padding: 16, borderRadius: radius.md, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnCancel: { padding: 16, borderRadius: radius.md, alignItems: "center", marginTop: 8 },
  btnCancelText: { color: colors.muted, fontWeight: "600", fontSize: 14 },
});
