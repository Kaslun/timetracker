import { useEffect, useMemo, useRef, useState } from "react";
import type { TaskWithProject } from "@shared/types";
import { useStore } from "@/store";
import { EmptyState, Ic } from "@/components";
import { rpc, on } from "@/lib/api";
import { formatHM } from "@/lib/time";
import { TaskRow } from "./TaskRow";

export function TasksTab() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const off = on("expanded:focus-search", () => inputRef.current?.focus());
    const onLocal = (): void => inputRef.current?.focus();
    window.addEventListener("attensi:focus-search", onLocal);
    return () => {
      off();
      window.removeEventListener("attensi:focus-search", onLocal);
    };
  }, []);

  const todayLogged = tasks.reduce((acc, t) => acc + t.todaySec, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        (t.ticket?.toLowerCase().includes(q) ?? false),
    );
  }, [query, tasks]);

  const start = (t: TaskWithProject) => async (): Promise<void> => {
    if (t.completedAt) return;
    if (t.active) {
      await useStore.getState().pause();
    } else {
      await useStore.getState().start(t.id);
    }
  };

  const toggleComplete = async (t: TaskWithProject): Promise<void> => {
    await rpc("task:setCompleted", {
      id: t.id,
      completed: !t.completedAt,
    });
  };

  const onArchive = async (t: TaskWithProject): Promise<void> => {
    await rpc("task:archive", { id: t.id });
  };

  const onCreate = async (): Promise<void> => {
    const title = query.trim();
    if (!title || !newProjectId) return;
    await rpc("task:create", { projectId: newProjectId, title });
    setQuery("");
    setShowCreate(false);
  };

  const showCreateRow = query.trim().length > 0 && filtered.length === 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Ic.Search s={13} />
        <input
          ref={inputRef}
          className="input"
          placeholder="Switch task · paste Linear/Jira url · or type new"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (showCreateRow && newProjectId) void onCreate();
              else if (filtered[0]) void start(filtered[0])();
            }
          }}
          style={{ fontSize: 12, flex: 1 }}
        />
        <span className="kbd" title="Press S to focus this list (in-app)">
          S
        </span>
      </div>
      <div className="scroll" style={{ flex: 1, overflow: "auto" }}>
        <div
          style={{
            padding: "12px 16px 6px",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span
            className="display"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink-2)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Today · {tasks.length} tasks
          </span>
          <span className="mono num ink-3" style={{ fontSize: 10 }}>
            {formatHM(todayLogged)}
          </span>
        </div>

        {tasks.length === 0 && !showCreateRow ? (
          <EmptyState
            title="No tasks yet"
            hint={
              projects.length === 0
                ? "Connect an integration in Settings, or just type a task name above to create one."
                : "Type a task name above and pick a project to create your first task."
            }
            action={
              projects.length === 0 ? (
                <button
                  className="btn"
                  onClick={() => void rpc("window:openSettings")}
                >
                  Open Settings
                </button>
              ) : undefined
            }
          />
        ) : null}

        {filtered.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            projects={projects}
            editing={editingId === t.id}
            onStartEdit={() => setEditingId(t.id)}
            onCancelEdit={() => setEditingId(null)}
            onArchive={() => void onArchive(t)}
            onToggleComplete={() => void toggleComplete(t)}
          />
        ))}

        {showCreateRow && (
          <div
            style={{
              padding: "14px 16px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
              No matches — create a new task “{query}”?
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="input"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "4px 6px",
                  fontSize: 12,
                  flex: 1,
                }}
              >
                <option value="">Pick project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                className="btn primary"
                disabled={!newProjectId}
                onClick={() => void onCreate()}
              >
                Create
              </button>
            </div>
          </div>
        )}

        {!showCreate && (
          <div style={{ padding: "16px 16px 6px" }}>
            <span
              className="display"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Recent · past 7 days
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

