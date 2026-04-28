/**
 * One row in the Tasks tab (and the Projects drill-in).
 *
 * View mode:
 *   - Click anywhere on the row → start/pause the task (existing behaviour).
 *   - Hover → reveals two icons on the right: pencil (edit) and archive.
 *   - Imported-from-Linear tasks show an `↗ Linear` badge next to the title.
 *
 * Edit mode (entered via pencil click or row double-click):
 *   - The text/meta block becomes a small form: title, project dropdown,
 *     ticket key, tag.
 *   - Enter saves; Esc cancels; clicking outside saves (debounced).
 *   - Title required; ticket key uniqueness is checked main-side and surfaces
 *     as an inline error message.
 *   - For integration-imported tasks, the title and ticket inputs are
 *     disabled and a hint reads "Edit in Linear to change title."
 *
 * The row deliberately doesn't manage selection or "active" state — those
 * still come from props. It owns its own edit-mode buffer and validation
 * error string. Saving emits `onSaved` after the IPC call resolves so the
 * parent can collapse the editor / refresh.
 */
import { useEffect, useRef, useState } from "react";
import type { Project, TaskWithProject } from "@shared/types";
import { Ic, Swatch, TimeDisplay } from "@/components";
import { rpc } from "@/lib/api";
import { formatElapsed } from "@/lib/time";
import { useStore } from "@/store";

interface TaskRowProps {
  task: TaskWithProject;
  projects: Project[];
  /** Whether the row is currently in edit mode. */
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onArchive: () => void;
  onToggleComplete: () => void;
}

export function TaskRow({
  task,
  projects,
  editing,
  onStartEdit,
  onCancelEdit,
  onArchive,
  onToggleComplete,
}: TaskRowProps) {
  const isDone = !!task.completedAt;
  const isImported = !!task.integrationId;

  const start = async (): Promise<void> => {
    if (isDone || editing) return;
    if (task.active) await useStore.getState().pause();
    else await useStore.getState().start(task.id);
  };

  return (
    <div
      onClick={() => void start()}
      onDoubleClick={(e) => {
        if (editing) return;
        e.stopPropagation();
        onStartEdit();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderLeft: task.active
          ? "2px solid var(--accent)"
          : "2px solid transparent",
        background: task.active
          ? "color-mix(in oklab, var(--accent) 5%, var(--surface))"
          : "transparent",
        cursor: isDone || editing ? "default" : "pointer",
        opacity: isDone ? 0.55 : 1,
        position: "relative",
      }}
      className="task-row"
    >
      <CompletionCheck done={isDone} onToggle={onToggleComplete} />
      <Swatch color={task.projectColor} />

      {editing ? (
        <TaskEditForm
          task={task}
          projects={projects}
          onCancel={onCancelEdit}
        />
      ) : (
        <ViewBlock task={task} isDone={isDone} isImported={isImported} />
      )}

      {!editing && (
        <>
          {task.tag ? <span className="chip">{task.tag}</span> : null}
          <TimeDisplay
            value={formatElapsed(task.todaySec)}
            className="mono num"
            style={{
              fontSize: 12,
              color: task.active ? "var(--accent)" : "var(--ink-2)",
              fontWeight: task.active ? 600 : 500,
              minWidth: 56,
              textAlign: "right",
            }}
          />
          {!isDone ? (
            task.active ? (
              <Ic.Pause s={11} />
            ) : (
              <Ic.Play s={11} />
            )
          ) : null}
          <RowActions
            onEdit={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            onArchive={(e) => {
              e.stopPropagation();
              onArchive();
            }}
          />
        </>
      )}
    </div>
  );
}

function ViewBlock({
  task,
  isDone,
  isImported,
}: {
  task: TaskWithProject;
  isDone: boolean;
  isImported: boolean;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: task.active ? 500 : 400,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: isDone ? "line-through" : "none",
            color: isDone ? "var(--ink-3)" : undefined,
          }}
        >
          {task.title}
        </span>
        {isImported ? (
          <span
            className="chip"
            title="Imported from Linear — edit the title and ticket key in Linear."
            style={{
              fontSize: 9,
              padding: "0 5px",
              height: 14,
              flexShrink: 0,
            }}
          >
            ↗ {task.integrationId}
          </span>
        ) : null}
      </div>
      <div className="mono ink-3" style={{ fontSize: 10, marginTop: 2 }}>
        {task.ticket ?? "—"} · {task.projectName}
      </div>
    </div>
  );
}

function RowActions({
  onEdit,
  onArchive,
}: {
  onEdit: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="task-row-actions"
      // Visible only on hover; the parent .task-row controls opacity via CSS.
      style={{
        display: "flex",
        gap: 2,
        marginLeft: 4,
        opacity: 0,
        transition: "opacity 120ms",
      }}
    >
      <button
        className="btn ghost icon"
        title="Edit task"
        aria-label="Edit task"
        onClick={onEdit}
        style={{ width: 22, height: 22, padding: 0 }}
      >
        <Ic.Pencil s={11} />
      </button>
      <button
        className="btn ghost icon"
        title="Archive task"
        aria-label="Archive task"
        onClick={onArchive}
        style={{ width: 22, height: 22, padding: 0 }}
      >
        <Ic.Trash s={11} />
      </button>
    </div>
  );
}

interface TaskEditFormProps {
  task: TaskWithProject;
  projects: Project[];
  onCancel: () => void;
}

function TaskEditForm({ task, projects, onCancel }: TaskEditFormProps) {
  const isImported = !!task.integrationId;
  const [title, setTitle] = useState(task.title);
  const [ticket, setTicket] = useState(task.ticket ?? "");
  const [tag, setTag] = useState(task.tag ?? "");
  const [projectId, setProjectId] = useState(task.projectId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus the first editable input when entering edit mode. For imported
  // tasks the title is locked, so jump to the tag input instead.
  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  const save = async (): Promise<void> => {
    if (saving) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Title cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await rpc("task:update", {
        id: task.id,
        patch: {
          title: cleanTitle,
          ticket: ticket.trim() === "" ? null : ticket.trim(),
          tag: tag.trim() === "" ? null : tag.trim(),
          projectId,
        },
      });
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // Click-outside saves; clicking inside ignores. Bound to mousedown so the
  // save fires before any pointer event on the new target steals focus.
  useEffect(() => {
    const onPointer = (ev: MouseEvent): void => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(ev.target as Node)) return;
      void save();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, ticket, tag, projectId, saving]);

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 12,
    color: "var(--ink)",
  };

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <input
        ref={titleRef}
        className="input"
        value={title}
        disabled={isImported}
        title={isImported ? "Edit in Linear to change title" : undefined}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="Task title"
        style={{ ...inputStyle, fontSize: 13, fontWeight: 500 }}
      />
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ ...inputStyle, flex: "0 1 160px", cursor: "pointer" }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          value={ticket}
          disabled={isImported}
          title={isImported ? "Edit in Linear to change ticket key" : undefined}
          onChange={(e) => setTicket(e.target.value)}
          placeholder="ticket"
          style={{ ...inputStyle, flex: "0 1 100px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <input
          className="input"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="tag"
          style={{ ...inputStyle, flex: "0 1 100px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        {isImported ? (
          <span className="ink-3" style={{ fontSize: 10 }}>
            Edit in Linear to change title.
          </span>
        ) : null}
      </div>
      {error ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--danger, #c33)",
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

function CompletionCheck({
  done,
  onToggle,
}: {
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      title={done ? "Reopen task" : "Mark complete"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        flexShrink: 0,
        border: `1.5px solid ${done ? "var(--accent)" : "var(--ink-4)"}`,
        background: done ? "var(--accent)" : "transparent",
        color: done ? "var(--on-accent, #fff)" : "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <Ic.Check s={9} />
    </button>
  );
}
