/**
 * Static metadata for the dashboard's CSV export panel.
 * Lives outside the component so the column/preset matrices can be reused
 * by tests and other dashboards without dragging React along.
 */
export const DASH_COLUMNS = [
  { id: "date", label: "Date", req: true },
  { id: "start", label: "Start", req: false },
  { id: "end", label: "End", req: false },
  { id: "duration", label: "Duration", req: true },
  { id: "project", label: "Project", req: true },
  { id: "ticket", label: "Ticket", req: false },
  { id: "task", label: "Task", req: true },
  { id: "tag", label: "Tag", req: false },
] as const;

export type ColId = (typeof DASH_COLUMNS)[number]["id"];

export const DASH_PRESETS = [
  { id: "sheets", label: "Sheets", hint: "all columns" },
  { id: "toggl", label: "Toggl", hint: "import-ready" },
  { id: "harvest", label: "Harvest", hint: "proj/task/hours" },
  { id: "custom", label: "Custom", hint: "pick yourself" },
] as const;

export type PresetId = (typeof DASH_PRESETS)[number]["id"];

export const PRESET_DEFAULT_COLS: Record<PresetId, ColId[]> = {
  sheets: [
    "date",
    "start",
    "end",
    "duration",
    "project",
    "ticket",
    "task",
    "tag",
  ],
  toggl: ["date", "start", "end", "duration", "project", "task", "tag"],
  harvest: ["date", "duration", "project", "task"],
  custom: ["date", "duration", "project", "task"],
};

export type Grouping = "entry" | "task" | "proj";

export const GROUPING_OPTIONS: ReadonlyArray<{ id: Grouping; label: string }> =
  [
    { id: "entry", label: "Each entry" },
    { id: "task", label: "Per task / day" },
    { id: "proj", label: "Per project / day" },
  ];
