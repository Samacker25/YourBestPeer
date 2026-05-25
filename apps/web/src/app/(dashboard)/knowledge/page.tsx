"use client";

import { useEffect, useRef, useState } from "react";
import { ragApi, type RagDocument, type RagSearchResult } from "@/lib/api";
import { useToast } from "@/components/Toast";

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-muted-foreground bg-muted/40",
  processing: "text-yellow-400 bg-yellow-400/10",
  ready: "text-emerald-400 bg-emerald-400/10",
  failed: "text-red-400 bg-red-400/10",
};

export default function KnowledgePage() {
  const [docs, setDocs] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<RagSearchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function load() {
    try {
      setDocs(await ragApi.list());
    } catch {
      toast("Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const doc = await ragApi.upload(file);
      setDocs((prev) => [doc, ...prev]);
      toast(`"${file.name}" uploaded — processing…`);
      // Poll status until ready or failed
      const interval = setInterval(async () => {
        try {
          const updated = await ragApi.list();
          setDocs(updated);
          const d = updated.find((x) => x.id === doc.id);
          if (d && (d.status === "ready" || d.status === "failed")) {
            clearInterval(interval);
            if (d.status === "ready") toast(`"${file.name}" is ready — ${d.chunk_count} chunks indexed`);
            else toast(`Failed to process "${file.name}"`, "error");
          }
        } catch {
          clearInterval(interval);
        }
      }, 3000);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, filename: string) {
    try {
      await ragApi.delete(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (result) setResult(null);
      toast(`"${filename}" deleted`);
    } catch {
      toast("Failed to delete document", "error");
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      setResult(await ragApi.search(query.trim()));
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Search failed", "error");
    } finally {
      setSearching(false);
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const readyCount = docs.filter((d) => d.status === "ready").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-8 py-5 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Knowledge Base</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {readyCount > 0 ? `${readyCount} document${readyCount !== 1 ? "s" : ""} indexed` : "Upload documents to search and chat with them"}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Document list */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border overflow-hidden">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mx-3 my-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 transition-colors cursor-pointer ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className={`h-7 w-7 mb-1.5 ${dragging ? "text-primary" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs text-muted-foreground text-center px-2">
              Drop a file here or <span className="text-primary">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">PDF, TXT, MD, DOCX · max 10 MB</p>
          </div>

          {/* Docs list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
            {loading ? (
              <p className="text-center text-xs text-muted-foreground py-8">Loading…</p>
            ) : docs.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">No documents yet</p>
            ) : docs.map((doc) => (
              <div key={doc.id} className="group flex items-start gap-2 rounded-xl border border-border bg-card/40 p-3 hover:bg-card transition-colors">
                <div className="mt-0.5 shrink-0 text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{doc.filename}</p>
                  <p className="text-xs text-muted-foreground/70">{fileSize(doc.file_size)}</p>
                  <span className={`mt-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[doc.status]}`}>
                    {doc.status === "processing" && (
                      <svg className="mr-1 h-2.5 w-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    {doc.status}
                    {doc.status === "ready" && ` · ${doc.chunk_count} chunks`}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  className="shrink-0 rounded-lg p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Search / Q&A */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <form onSubmit={handleSearch} className="flex items-center gap-3 border-b border-border px-6 py-4 shrink-0">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your documents…"
                className="w-full rounded-xl border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim() || readyCount === 0}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {readyCount === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">No documents indexed yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Upload a PDF, TXT, MD, or DOCX file to get started</p>
              </div>
            )}

            {searching && (
              <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Searching your documents…
              </div>
            )}

            {result && (
              <div className="max-w-2xl space-y-4">
                {/* Answer */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    AI Answer
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.answer}</p>
                </div>

                {/* Source chunks */}
                {result.chunks.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sources</p>
                    <div className="space-y-2">
                      {result.chunks.map((chunk, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card/40 p-3">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Chunk {chunk.chunk_index + 1}</span>
                            <span className="text-xs text-muted-foreground">{Math.round(chunk.score * 100)}% match</span>
                          </div>
                          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4">{chunk.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
