"use client";

import { useEffect, useState } from "react";
import { projectsApi, tasksApi, type Project, type Task } from "@/lib/api";
import { useToast } from "@/components/Toast";

const COLOR_PRESETS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#84cc16",
];

function ProjectCard({
  project,
  tasks,
  onEdit,
  onDelete,
}: {
  project: Project;
  tasks: Task[];
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
}) {
  const todo = tasks.filter((t) => t.status === "todo").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ backgroundColor: project.color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onEdit(project)}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{done}/{total} tasks done</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: project.color }}
          />
        </div>
        <div className="flex gap-3 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            {todo} to-do
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {done} done
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Project;
  onSave: (data: { name: string; description: string; color: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? COLOR_PRESETS[0]);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), color });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="font-semibold text-foreground text-lg">
          {initial ? "Edit Project" : "New Project"}
        </h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Side project, Work Q3"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-lg transition hover:scale-110"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
            style={{ backgroundColor: color }}
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | Project | null>(null);

  useEffect(() => {
    Promise.all([projectsApi.list(), tasksApi.list()])
      .then(([p, t]) => { setProjects(p); setTasks(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(data: { name: string; description: string; color: string }) {
    if (modal && modal !== "create") {
      const updated = await projectsApi.update(modal.id, data);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast("Project updated", "success");
    } else {
      const created = await projectsApi.create(data);
      setProjects((prev) => [created, ...prev]);
      toast("Project created", "success");
    }
    setModal(null);
  }

  async function handleDelete(id: string) {
    await projectsApi.delete(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast("Project deleted", "info");
  }

  const tasksByProject = (projectId: string) => tasks.filter((t) => t.project_id === projectId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organise your tasks into projects to track progress.
          </p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <div className="text-4xl mb-3">📁</div>
          <p className="font-semibold text-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first project to organise your tasks.
          </p>
          <button
            onClick={() => setModal("create")}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            Create project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={tasksByProject(project.id)}
              onEdit={(p) => setModal(p)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modal && (
        <ProjectModal
          initial={modal !== "create" ? modal : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
