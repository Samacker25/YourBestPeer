"use client";

import { useEffect, useState, useRef } from "react";
import { notesApi, type Note } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function NotesPage() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [scanning, setScanning] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    notesApi.list().then((data) => {
      setNotes(data);
      if (data.length > 0) open(data[0]);
    }).finally(() => setLoading(false));
  }, []);

  function open(note: Note) {
    setActiveId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags.join(", "));
    setDirty(false);
  }

  function newNote() {
    setActiveId(null);
    setTitle("");
    setContent("");
    setTags("");
    setDirty(false);
  }

  function markDirty() {
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 1500);
  }

  async function save() {
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    setSaving(true);
    try {
      if (activeId) {
        const updated = await notesApi.update(activeId, { title: title || "Untitled", content, tags: tagList });
        setNotes((prev) => prev.map((n) => (n.id === activeId ? updated : n)));
      } else {
        const created = await notesApi.create({ title: title || "Untitled", content, tags: tagList });
        setNotes((prev) => [created, ...prev]);
        setActiveId(created.id);
      }
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    await notesApi.delete(id);
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (activeId === id) {
      if (remaining.length > 0) open(remaining[0]);
      else newNote();
    }
  }

  async function scanImage(file: File) {
    setScanning(true);
    try {
      const created = await notesApi.scanImage(file);
      setNotes((prev) => [created, ...prev]);
      open(created);
      toast(`Note created from image: "${created.title}"`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to scan image", "error");
    } finally {
      setScanning(false);
    }
  }

  const activeNote = notes.find((n) => n.id === activeId);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Notes list */}
      <div className="w-64 shrink-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <h1 className="font-semibold text-foreground">Notes</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scanInputRef.current?.click()}
              disabled={scanning}
              title="Scan image to note"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition"
            >
              {scanning ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              )}
            </button>
            <button
              onClick={newNote}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition"
              title="New note"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>
        <input
          ref={scanInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) scanImage(f); e.target.value = ""; }}
        />

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)
          ) : notes.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No notes yet. Create one!</p>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => open(note)}
                className={`group w-full rounded-xl px-3 py-2.5 text-left transition ${
                  activeId === note.id ? "bg-primary/12 border border-primary/20" : "hover:bg-muted/60 border border-transparent"
                }`}
              >
                <p className={`text-sm font-medium truncate ${activeId === note.id ? "text-primary" : "text-foreground"}`}>
                  {note.title || "Untitled"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {note.content.slice(0, 60) || "Empty note"}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="hidden rounded p-0.5 text-red-400 hover:bg-red-500/10 group-hover:block"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2.5">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-sm text-muted-foreground">
              {activeId ? `Editing · ${activeNote ? new Date(activeNote.updated_at).toLocaleString() : ""}` : "New note"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs transition ${dirty ? "text-yellow-400" : "text-muted-foreground/50"}`}>
              {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
            </span>
            <button
              onClick={save}
              disabled={!dirty && !!activeId}
              className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition"
            >
              {activeId ? "Save" : "Create"}
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="border-b border-border px-5 py-3">
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty(); }}
            placeholder="Note title…"
            className="w-full bg-transparent text-xl font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          <input
            value={tags}
            onChange={(e) => { setTags(e.target.value); markDirty(); }}
            placeholder="Tags (comma separated): work, ideas, todo"
            className="mt-2 w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          {tags && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-full bg-primary/15 border border-primary/20 px-2.5 py-0.5 text-xs text-primary font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); markDirty(); }}
          placeholder="Start writing…&#10;&#10;Your notes are auto-saved as you type."
          className="flex-1 resize-none bg-transparent px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none leading-relaxed"
        />
      </div>
    </div>
  );
}
