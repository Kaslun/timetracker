import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TASK_FILTERS, MAX_SAVED_TASK_VIEWS } from "@shared/constants";
import { applyTaskFilters, sortTasks } from "@shared/lib/taskFilter";
import type {
  SavedTaskView,
  TaskFilters,
  TaskWithProject,
} from "@shared/types";
import { TaskRow } from "./TaskRow";
import { TasksControlBar } from "./TasksControlBar";
import { EmptyState } from "@/components";
import { rpc, on } from "@/lib/api";
import { formatHM } from "@/lib/time";
import { useStore } from "@/store";

export function TasksTab() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);

  // Local mirror of the persisted filter — keeps typing in the search input
  // snappy while we debounce the write to settings.
  const [filters, setFilters] = useState<TaskFilters>(
    settings.taskFilters ?? DEFAULT_TASK_FILTERS,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce filter writes — typing in the search box should not punch the
  // SQLite settings table on every keystroke. 300 ms feels instant but
  // collapses the typical "type then pause" pattern into one IPC call.
  useEffect(() => {
    const handle = setTimeout(() => {
      const persisted = settings.taskFilters;
      if (JSON.stringify(persisted) === JSON.stringify(filters)) return;
      void patchSettings({ taskFilters: filters });
    }, 300);
    return () => clearTimeout(handle);
  }, [filters, patchSettings, settings.taskFilters]);

  // Keep local state in sync if settings update from elsewhere (rare — but
  // multiple windows could conceivably edit the same field).
  useEffect(() => {
    setFilters(settings.taskFilters ?? DEFAULT_TASK_FILTERS);
  }, [settings.taskFilters]);

  useEffect(() => {
    const off = on("expanded:focus-search", () => inputRef.current?.focus());
    const onLocal = (): void => inputRef.current?.focus();
    window.addEventListener("attensi:focus-search", onLocal);
    return () => {
      off();
      window.removeEventListener("attensi:focus-search", onLocal);
    };
  }, []);

  // Run filter then sort. Both are pure shared helpers; tests live in
  // tests/unit/taskFilter.test.ts.
  const visible = useMemo(() => {
    return sortTasks(applyTaskFilters(tasks, filters), filters.sort);
  }, [tasks, filters]);

  const todayLogged = visible.reduce((acc, t) => acc + t.todaySec, 0);

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
    const title = filters.query.trim();
    if (!title || !newProjectId) return;
    await rpc("task:create", { projectId: newProjectId, title });
    setFilters({ ...filters, query: "" });
    setShowCreate(false);
  };

  const showCreateRow = filters.query.trim().length > 0 && visible.length === 0;

  // Saved-view operations are local mutations on Settings.savedTaskViews.
  // We give each view a stable id so the chip key survives re-render.
  const onSaveView = async (name: string): Promise<void> => {
    const existing = settings.savedTaskViews ?? [];
    if (existing.length >= MAX_SAVED_TASK_VIEWS) return;
    const view: SavedTaskView = {
      id: `view-${Date.now().toString(36)}`,
      name: name.slice(0, 40),
      filters: { ...filters },
    };
    await patchSettings({ savedTaskViews: [...existing, view] });
  };

  const onDeleteView = async (id: string): Promise<void> => {
    const next = (settings.savedTaskViews ?? []).filter((v) => v.id !== id);
    await patchSettings({ savedTaskViews: next });
  };

  const onApplyView = (view: SavedTaskView): void => {
    setFilters({ ...view.filters });
  };

  const empty = visible.length === 0 && !showCreateRow;
  const hasFilterUnmatched = empty && tasks.length > 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TasksControlBar
        filters={filters}
        onChange={setFilters}
        projects={projects}
        savedViews={settings.savedTaskViews ?? []}
        onSaveView={onSaveView}
        onApplyView={onApplyView}
        onDeleteView={onDeleteView}
      />

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
            Tasks · {visible.length}
            {visible.length !== tasks.length && (
              <span className="ink-3"> of {tasks.length}</span>
            )}
          </span>
          <span className="mono num ink-3" style={{ fontSize: 10 }}>
            {formatHM(todayLogged)} today
          </span>
        </div>

        {empty && tasks.length === 0 ? (
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

        {hasFilterUnmatched && (
          <EmptyState
            title="No tasks match these filters"
            hint="Clear filters or try a different combination."
            action={
              <button
                className="btn"
                onClick={() => setFilters({ ...DEFAULT_TASK_FILTERS })}
              >
                Clear filters
              </button>
            }
          />
        )}

        {visible.map((t) => (
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
              No matches — create a new task “{filters.query}”?
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

        {!showCreate && visible.length > 0 && (
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
              Showing{" "}
              {filters.sort === "suggested"
                ? "suggested order"
                : filters.sort === "updated"
                  ? "most-recently updated"
                  : filters.sort === "priority"
                    ? "highest priority first"
                    : filters.sort === "tracked"
                      ? "most time tracked"
                      : filters.sort === "alpha"
                        ? "alphabetical"
                        : "creation date"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
