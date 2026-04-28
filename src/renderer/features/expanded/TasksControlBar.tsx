/**
 * Filter + sort + saved-views control row at the top of the Tasks tab.
 *
 * Owns no state of its own — it's a thin shell over `TaskFilters` from
 * settings, with `onChange` writing back. The Tasks tab persists the
 * resulting filter to `Settings.taskFilters` via `settings:patch` so the
 * last-used view is restored at launch.
 *
 * UI shape (left → right):
 *   [Search input]  [Project chips]  [Source chips]  [Tag chips]
 *   [Status chip]  [Priority chips]  [Sort dropdown]  [Saved views ▾]
 *   [Clear filters link, only when filters are active]
 */
import { useEffect, useMemo, useState } from "react";
import type {
  Project,
  SavedTaskView,
  TaskFilters,
  TaskPriority,
  TaskSort,
} from "@shared/types";
import { TASK_PRIORITIES } from "@shared/types";
import {
  TASK_SOURCES,
  sourceColor,
  sourceLabel,
} from "@shared/integrations/registry";
import {
  hasActiveFilters,
  priorityColor,
  priorityLabel,
} from "@shared/lib/taskFilter";
import { DEFAULT_TASK_FILTERS, MAX_SAVED_TASK_VIEWS } from "@shared/constants";
import { Ic } from "@/components";
import { rpc } from "@/lib/api";

interface TasksControlBarProps {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  projects: Project[];
  savedViews: SavedTaskView[];
  onSaveView: (name: string) => Promise<void>;
  onApplyView: (view: SavedTaskView) => void;
  onDeleteView: (id: string) => Promise<void>;
}

const SORT_LABELS: Record<TaskSort, string> = {
  suggested: "Suggested",
  updated: "Recently updated",
  priority: "Priority",
  tracked: "Time tracked",
  alpha: "Alphabetical",
  created: "Created date",
};

export function TasksControlBar({
  filters,
  onChange,
  projects,
  savedViews,
  onSaveView,
  onApplyView,
  onDeleteView,
}: TasksControlBarProps) {
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [savingViewName, setSavingViewName] = useState<string | null>(null);

  // Pull the distinct tag list once on mount, refetch when projects change
  // (cheap proxy for "task list churned"). We don't need realtime updates
  // here — stale chips are fine, the user picks from the union.
  useEffect(() => {
    void rpc("task:distinctTags").then(setTagOptions);
  }, [projects.length]);

  const update = (patch: Partial<TaskFilters>): void => {
    onChange({ ...filters, ...patch });
  };

  const clear = (): void => {
    onChange({ ...DEFAULT_TASK_FILTERS });
  };

  const active = hasActiveFilters(filters);

  return (
    <div
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Saved views row (only renders when at least one view exists). */}
      {savedViews.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span className="ink-3" style={{ fontSize: 10 }}>
            Saved
          </span>
          {savedViews.map((v) => (
            <SavedViewChip
              key={v.id}
              view={v}
              onApply={() => onApplyView(v)}
              onDelete={() => void onDeleteView(v.id)}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Ic.Search s={13} />
        <input
          className="input"
          placeholder="Search title or ticket key…"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          style={{ fontSize: 12, flex: 1 }}
        />
        <select
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as TaskSort })}
          style={{
            background: "var(--surface-2)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "4px 6px",
            fontSize: 11,
            cursor: "pointer",
          }}
          title="Sort tasks"
        >
          {(Object.keys(SORT_LABELS) as TaskSort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
        <SaveViewMenu
          disabled={!active || savedViews.length >= MAX_SAVED_TASK_VIEWS}
          savingName={savingViewName}
          onStart={() => setSavingViewName("")}
          onCancel={() => setSavingViewName(null)}
          onChange={setSavingViewName}
          onSave={async (name) => {
            await onSaveView(name);
            setSavingViewName(null);
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <MultiChip
          label="Project"
          options={projects.map((p) => ({
            id: p.id,
            label: p.name,
            color: p.color,
          }))}
          selected={filters.projectIds}
          onChange={(next) => update({ projectIds: next })}
        />
        <MultiChip
          label="Source"
          options={TASK_SOURCES.map((s) => ({
            id: s,
            label: sourceLabel(s),
            color: sourceColor(s),
          }))}
          selected={filters.sources}
          onChange={(next) => update({ sources: next })}
        />
        <MultiChip
          label="Tag"
          options={tagOptions.map((t) => ({ id: t, label: t }))}
          selected={filters.tags}
          onChange={(next) => update({ tags: next })}
        />
        <SingleChip
          label="Status"
          options={[
            { id: "active", label: "Active" },
            { id: "archived", label: "Archived" },
            { id: "all", label: "All" },
          ]}
          selected={filters.status}
          onChange={(next) => update({ status: next as TaskFilters["status"] })}
        />
        <MultiChip
          label="Priority"
          options={TASK_PRIORITIES.map((p) => ({
            id: p,
            label: priorityLabel(p),
            color: priorityColor(p),
          }))}
          selected={filters.priorities}
          onChange={(next) => update({ priorities: next as TaskPriority[] })}
        />
        {active && (
          <button
            className="btn ghost"
            type="button"
            onClick={clear}
            style={{ padding: "2px 8px", fontSize: 10 }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

interface ChipOption {
  id: string;
  label: string;
  color?: string;
}

interface MultiChipProps {
  label: string;
  options: ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * Multi-select dropdown rendered as a single chip with a count badge.
 * Click toggles the dropdown; click outside closes it; checkbox-style
 * options inside.
 */
function MultiChip({ label, options, selected, onChange }: MultiChipProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const summary = useMemo(() => {
    if (selected.length === 0) return label;
    if (selected.length === 1) {
      const opt = options.find((o) => o.id === selected[0]);
      return `${label}: ${opt?.label ?? selected[0]}`;
    }
    return `${label} · ${selected.length}`;
  }, [selected, options, label]);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn"
        style={{
          padding: "2px 8px",
          fontSize: 10,
          fontWeight: selected.length > 0 ? 600 : 500,
          background:
            selected.length > 0
              ? "color-mix(in oklab, var(--accent) 15%, var(--surface))"
              : "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: 999,
          height: 22,
        }}
      >
        {summary}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "calc(100% + 4px)",
              zIndex: 11,
              background: "var(--surface)",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--radius)",
              padding: 6,
              boxShadow: "var(--shadow-md)",
              minWidth: 180,
              maxHeight: 240,
              overflow: "auto",
            }}
          >
            {options.length === 0 ? (
              <div
                className="ink-3"
                style={{ fontSize: 11, padding: "6px 8px" }}
              >
                No options yet.
              </div>
            ) : (
              options.map((o) => {
                const checked = selectedSet.has(o.id);
                return (
                  <label
                    key={o.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 6px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, o.id]
                          : selected.filter((s) => s !== o.id);
                        onChange(next);
                      }}
                      style={{ margin: 0 }}
                    />
                    {o.color ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: o.color,
                          flexShrink: 0,
                        }}
                      />
                    ) : null}
                    <span>{o.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface SingleChipProps {
  label: string;
  options: ChipOption[];
  selected: string;
  onChange: (next: string) => void;
}

function SingleChip({ label, options, selected, onChange }: SingleChipProps) {
  const current = options.find((o) => o.id === selected);
  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      style={{
        background:
          selected === "active"
            ? "var(--surface-2)"
            : "color-mix(in oklab, var(--accent) 15%, var(--surface))",
        color: "var(--ink)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 10,
        height: 22,
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {label}: {o.label}
        </option>
      ))}
      {/* Defensive fallback if `selected` doesn't match any option. */}
      {!current && <option value={selected}>Unknown</option>}
    </select>
  );
}

interface SaveViewMenuProps {
  disabled: boolean;
  savingName: string | null;
  onStart: () => void;
  onCancel: () => void;
  onChange: (name: string) => void;
  onSave: (name: string) => Promise<void>;
}

function SaveViewMenu({
  disabled,
  savingName,
  onStart,
  onCancel,
  onChange,
  onSave,
}: SaveViewMenuProps) {
  if (savingName === null) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onStart}
        className="btn"
        title={
          disabled
            ? "Apply at least one filter (max 5 saved views)"
            : "Save current filters as a view"
        }
        style={{ padding: "2px 8px", fontSize: 10 }}
      >
        Save view
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input
        autoFocus
        placeholder="View name"
        value={savingName}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && savingName.trim()) {
            void onSave(savingName.trim());
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: "2px 6px",
          fontSize: 11,
          width: 120,
        }}
      />
      <button
        type="button"
        className="btn primary"
        onClick={() => void onSave(savingName.trim())}
        disabled={!savingName.trim()}
        style={{ padding: "2px 8px", fontSize: 10 }}
      >
        Save
      </button>
      <button
        type="button"
        className="btn ghost"
        onClick={onCancel}
        style={{ padding: "2px 6px", fontSize: 10 }}
      >
        Cancel
      </button>
    </div>
  );
}

interface SavedViewChipProps {
  view: SavedTaskView;
  onApply: () => void;
  onDelete: () => void;
}

function SavedViewChip({ view, onApply, onDelete }: SavedViewChipProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: "0 0 0 8px",
        fontSize: 10,
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        height: 20,
      }}
    >
      <button
        type="button"
        onClick={onApply}
        style={{
          background: "transparent",
          border: 0,
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: 10,
          padding: "0 2px",
        }}
      >
        {view.name}
      </button>
      <button
        type="button"
        title="Delete saved view"
        aria-label={`Delete saved view ${view.name}`}
        onClick={onDelete}
        style={{
          background: "transparent",
          border: 0,
          color: "var(--ink-3)",
          cursor: "pointer",
          padding: "0 4px",
          height: "100%",
        }}
      >
        ×
      </button>
    </span>
  );
}
