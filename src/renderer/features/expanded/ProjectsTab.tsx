/**
 * Projects tab — fifth surface in the expanded window.
 *
 * Two views in one component:
 *   1. **List**: every project with its color dot, name, totals, time tracked,
 *      open task count. Toggle for week/month range. `+ New project` opens an
 *      inline (slide-down, not modal) form. Hover row → pencil + archive.
 *   2. **Drill-in**: clicking a row swaps the body for a panel showing the
 *      project's tasks (active + archived toggle), a daily bar chart, and the
 *      top 5 tasks by time. Back button returns to the list.
 *
 * Stats and per-project task lists are fetched via dedicated IPC channels
 * rather than derived in the renderer, so we don't have to ship every entry
 * into the renderer just to compute totals.
 *
 * Visual language matches the other tabs: same paddings (12/16px), same row
 * heights, same swatches and chips, same `--accent` highlights.
 */
import { useEffect, useMemo, useState } from "react";
import type {
  Project,
  ProjectStats,
  TaskWithProject,
} from "@shared/types";
import { useStore } from "@/store";
import { EmptyState, Ic, Swatch, TimeDisplay } from "@/components";
import { rpc } from "@/lib/api";
import { formatHM } from "@/lib/time";
import { TaskRow } from "./TaskRow";

type Range = "week" | "month";

const COLOR_PALETTE = [
  "#5e6ad2",
  "#10b981",
  "#f59e42",
  "#ef4444",
  "#a855f7",
  "#0ea5e9",
  "#ec4899",
  "#facc15",
  "#84cc16",
  "#06b6d4",
];

export function ProjectsTab() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const [range, setRange] = useState<Range>("week");
  const [stats, setStats] = useState<Map<string, ProjectStats>>(new Map());
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drillId, setDrillId] = useState<string | null>(null);

  // Refetch stats whenever the range, projects, or task list changes (the
  // latter signals that someone created/edited/archived a task elsewhere).
  useEffect(() => {
    void rpc("project:stats", { range }).then((rows) => {
      const m = new Map<string, ProjectStats>();
      for (const r of rows) m.set(r.projectId, r);
      setStats(m);
    });
  }, [range, projects, tasks]);

  if (drillId) {
    const project = projects.find((p) => p.id === drillId);
    if (!project) {
      setDrillId(null);
      return null;
    }
    return (
      <ProjectDrillIn
        project={project}
        onBack={() => setDrillId(null)}
        onArchived={() => {
          setDrillId(null);
        }}
      />
    );
  }

  const visible = projects.filter(
    (p) => showArchived || p.archivedAt == null,
  );

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
        <Ic.Folder s={13} />
        <span
          className="display"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
        >
          Projects · {visible.length}
        </span>
        <div style={{ flex: 1 }} />
        <RangeToggle value={range} onChange={setRange} />
        <label
          className="ink-3"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            style={{ margin: 0 }}
          />
          archived
        </label>
        <button
          className="btn"
          onClick={() => setCreating((v) => !v)}
          style={{ padding: "4px 8px", fontSize: 11 }}
        >
          <Ic.Plus s={11} /> New project
        </button>
      </div>

      <div className="scroll" style={{ flex: 1, overflow: "auto" }}>
        {creating ? (
          <ProjectForm
            onSubmit={async (input) => {
              await rpc("project:create", input);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : null}

        {visible.length === 0 && !creating ? (
          <EmptyState
            icon={<Ic.Folder s={20} />}
            title="No projects yet"
            hint="Create one or connect an integration to import projects."
            action={
              <button className="btn primary" onClick={() => setCreating(true)}>
                Create project
              </button>
            }
          />
        ) : null}

        {visible.map((p) => {
          if (editingId === p.id) {
            return (
              <ProjectForm
                key={p.id}
                project={p}
                onSubmit={async (input) => {
                  await rpc("project:update", { id: p.id, patch: input });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            );
          }
          const s = stats.get(p.id);
          return (
            <ProjectListRow
              key={p.id}
              project={p}
              stats={s}
              onOpen={() => setDrillId(p.id)}
              onEdit={() => setEditingId(p.id)}
              onArchive={async () => {
                if (
                  !window.confirm(
                    `Archive "${p.name}"? All its open tasks will be archived too.`,
                  )
                )
                  return;
                await rpc("project:archive", { id: p.id });
              }}
              onUnarchive={async () => {
                await rpc("project:unarchive", { id: p.id });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ProjectListRowProps {
  project: Project;
  stats: ProjectStats | undefined;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
}

function ProjectListRow({
  project,
  stats,
  onOpen,
  onEdit,
  onArchive,
  onUnarchive,
}: ProjectListRowProps) {
  const archived = project.archivedAt != null;
  return (
    <div
      onClick={onOpen}
      className="project-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderLeft: "2px solid transparent",
        cursor: "pointer",
        opacity: archived ? 0.55 : 1,
      }}
    >
      <Swatch color={project.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {project.name}
          </span>
          {project.integrationId ? (
            <span
              className="chip"
              title={`Imported from ${project.integrationId}`}
              style={{ fontSize: 9, padding: "0 5px", height: 14 }}
            >
              ↗ {project.integrationId}
            </span>
          ) : null}
        </div>
        <div className="mono ink-3" style={{ fontSize: 10, marginTop: 2 }}>
          {stats?.totalTasks ?? 0} tasks · {stats?.openTasks ?? 0} open
          {project.ticketPrefix ? ` · ${project.ticketPrefix}` : ""}
        </div>
      </div>
      <TimeDisplay
        value={formatHM(stats?.trackedSec ?? 0)}
        className="mono num"
        style={{
          fontSize: 12,
          color: "var(--ink-2)",
          minWidth: 56,
          textAlign: "right",
        }}
      />
      <div
        className="project-row-actions"
        style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 120ms" }}
      >
        <button
          className="btn ghost icon"
          title="Edit project"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={{ width: 22, height: 22, padding: 0 }}
        >
          <Ic.Pencil s={11} />
        </button>
        <button
          className="btn ghost icon"
          title={archived ? "Restore project" : "Archive project"}
          onClick={(e) => {
            e.stopPropagation();
            if (archived) onUnarchive();
            else onArchive();
          }}
          style={{ width: 22, height: 22, padding: 0 }}
        >
          <Ic.Archive s={11} />
        </button>
      </div>
    </div>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: Range;
  onChange: (v: Range) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--surface-2)",
        borderRadius: 6,
        padding: 2,
      }}
    >
      {(["week", "month"] as const).map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          style={{
            background: value === r ? "var(--surface)" : "transparent",
            border: 0,
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 10,
            fontWeight: value === r ? 600 : 500,
            color: value === r ? "var(--ink)" : "var(--ink-3)",
            cursor: "pointer",
          }}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

interface ProjectFormProps {
  project?: Project;
  onSubmit: (input: {
    name: string;
    color: string;
    ticketPrefix?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(project?.color ?? COLOR_PALETTE[0]);
  const [ticketPrefix, setTicketPrefix] = useState(project?.ticketPrefix ?? "");
  const [submitting, setSubmitting] = useState(false);
  const isImported = !!project?.integrationId;

  const submit = async (): Promise<void> => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        color,
        ticketPrefix: ticketPrefix.trim() === "" ? null : ticketPrefix.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--line)",
        background: "var(--surface-2)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Swatch color={color} />
        <input
          className="input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isImported}
          placeholder="Project name"
          style={{
            flex: 1,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "5px 8px",
            fontSize: 13,
            fontWeight: 500,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <input
          className="input"
          value={ticketPrefix}
          onChange={(e) => setTicketPrefix(e.target.value)}
          placeholder="prefix"
          style={{
            width: 80,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "5px 8px",
            fontSize: 12,
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {COLOR_PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title={c}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: c,
              border:
                color === c
                  ? "2px solid var(--ink)"
                  : "2px solid transparent",
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn primary"
          onClick={() => void submit()}
          disabled={submitting || !name.trim()}
        >
          {project ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}

interface ProjectDrillInProps {
  project: Project;
  onBack: () => void;
  onArchived: () => void;
}

function ProjectDrillIn({ project, onBack, onArchived }: ProjectDrillInProps) {
  const allProjects = useStore((s) => s.projects);
  const allTasks = useStore((s) => s.tasks);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [breakdown, setBreakdown] = useState<
    Array<{ date: string; seconds: number }>
  >([]);
  const [range, setRange] = useState<Range>("week");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Re-fetch when archived toggle, project, or any external task change happens
  // (allTasks acts as a "tasks store changed" beacon).
  useEffect(() => {
    void rpc("project:tasks", {
      projectId: project.id,
      includeArchived,
    }).then(setTasks);
  }, [project.id, includeArchived, allTasks]);

  useEffect(() => {
    void rpc("project:dailyBreakdown", {
      projectId: project.id,
      range,
    }).then(setBreakdown);
  }, [project.id, range, allTasks]);

  const top5 = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => b.todaySec - a.todaySec)
        .slice(0, 5)
        .filter((t) => t.todaySec > 0),
    [tasks],
  );

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
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          className="btn ghost icon"
          onClick={onBack}
          title="Back to projects"
          aria-label="Back to projects"
        >
          <Ic.Chevron dir="left" s={12} />
        </button>
        <Swatch color={project.color} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{project.name}</span>
        {project.integrationId ? (
          <span
            className="chip"
            style={{ fontSize: 9, padding: "0 5px", height: 14 }}
          >
            ↗ {project.integrationId}
          </span>
        ) : null}
        <div style={{ flex: 1 }} />
        <RangeToggle value={range} onChange={setRange} />
        <button
          className="btn"
          onClick={async () => {
            if (
              !window.confirm(
                `Archive "${project.name}"? All its open tasks will be archived too.`,
              )
            )
              return;
            await rpc("project:archive", { id: project.id });
            onArchived();
          }}
          style={{ padding: "4px 8px", fontSize: 11 }}
        >
          Archive
        </button>
      </div>

      <div className="scroll" style={{ flex: 1, overflow: "auto" }}>
        <BreakdownChart breakdown={breakdown} />

        <div style={{ padding: "16px 16px 4px" }}>
          <span
            className="display"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Top tasks · {range}
          </span>
        </div>
        {top5.length === 0 ? (
          <div
            className="ink-3"
            style={{ padding: "0 16px 12px", fontSize: 11 }}
          >
            No tracked time yet in this range.
          </div>
        ) : (
          top5.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                gap: 8,
                padding: "6px 16px",
                fontSize: 12,
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                {t.ticket ? <span className="mono">{t.ticket} · </span> : null}
                {t.title}
              </span>
              <TimeDisplay
                value={formatHM(t.todaySec)}
                className="mono num ink-2"
                style={{ fontSize: 11 }}
              />
            </div>
          ))
        )}

        <div
          style={{
            padding: "16px 16px 4px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span
            className="display"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Tasks · {tasks.length}
          </span>
          <label
            className="ink-3"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{ margin: 0 }}
            />
            include archived
          </label>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks here"
            hint="Add a task in the Tasks tab and assign it to this project."
          />
        ) : null}

        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            projects={allProjects}
            editing={editingId === t.id}
            onStartEdit={() => setEditingId(t.id)}
            onCancelEdit={() => setEditingId(null)}
            onArchive={() => {
              void rpc("task:archive", { id: t.id });
            }}
            onToggleComplete={() =>
              void rpc("task:setCompleted", {
                id: t.id,
                completed: !t.completedAt,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function BreakdownChart({
  breakdown,
}: {
  breakdown: Array<{ date: string; seconds: number }>;
}) {
  const max = Math.max(1, ...breakdown.map((d) => d.seconds));
  return (
    <div
      style={{
        padding: "16px 16px 8px",
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        height: 80,
        borderBottom: "1px solid var(--line)",
      }}
    >
      {breakdown.map((d) => {
        const h = Math.max(2, Math.round((d.seconds / max) * 60));
        return (
          <div
            key={d.date}
            title={`${d.date} · ${formatHM(d.seconds)}`}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <div
              style={{
                width: "100%",
                height: h,
                background: "var(--accent)",
                borderRadius: "2px 2px 0 0",
                opacity: d.seconds === 0 ? 0.15 : 0.8,
              }}
            />
            <span
              className="mono ink-3"
              style={{ fontSize: 8, lineHeight: 1 }}
            >
              {d.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
