import { writeFileSync } from "node:fs";
import { dialog, BrowserWindow } from "electron";
import type { EntryRow } from "@shared/types";
import { entries } from "../db/repos/entries";
import { startOfDay, startOfWeek, endOfWeek } from "../db/utils";

export type Preset = "sheets" | "toggl" | "harvest" | "custom";
export type Range = "today" | "week" | "last" | "month" | "custom";
export type Grouping = "entry" | "task" | "proj";

export interface ExportInput {
  range: Range;
  from?: number;
  to?: number;
  columns: string[];
  grouping: Grouping;
  preset: Preset;
}

const COLUMN_ORDER = [
  "date",
  "start",
  "end",
  "duration",
  "project",
  "client",
  "ticket",
  "task",
  "tag",
  "tags",
  "notes",
] as const;
type ColumnId = (typeof COLUMN_ORDER)[number];

const PRESET_COLUMNS: Record<Preset, ColumnId[]> = {
  sheets: [
    "date",
    "start",
    "end",
    "duration",
    "project",
    "client",
    "ticket",
    "task",
    "tag",
    "notes",
  ],
  toggl: ["date", "start", "end", "duration", "project", "task", "tag"],
  harvest: ["date", "duration", "project", "task", "notes"],
  custom: ["date", "start", "end", "duration", "project", "task"],
};

export function presetColumns(preset: Preset): string[] {
  return PRESET_COLUMNS[preset];
}

function rangeToDates(
  range: Range,
  from?: number,
  to?: number,
): { from: number; to: number } {
  const now = Date.now();
  switch (range) {
    case "today":
      return { from: startOfDay(now), to: now };
    case "week":
      return { from: startOfWeek(now), to: endOfWeek(now) };
    case "last": {
      const last = startOfWeek(now) - 1;
      return { from: startOfWeek(last), to: endOfWeek(last) };
    }
    case "month": {
      const d = new Date(now);
      const first = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      return { from: first, to: now };
    }
    case "custom": {
      if (from == null || to == null)
        throw new Error("custom range requires from + to");
      return { from, to };
    }
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtClock(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtDuration(secs: number): string {
  return (secs / 3600).toFixed(2);
}

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

interface FlatRow {
  date: string;
  start: string;
  end: string;
  duration: string;
  project: string;
  client: string;
  ticket: string;
  task: string;
  tag: string;
  tags: string;
  notes: string;
}

function entryToFlat(e: EntryRow, now: number): FlatRow {
  const end = e.endedAt ?? now;
  const dur = (end - e.startedAt) / 1000;
  return {
    date: fmtDate(e.startedAt),
    start: fmtClock(e.startedAt),
    end: e.endedAt ? fmtClock(e.endedAt) : "",
    duration: fmtDuration(dur),
    project: e.projectName,
    client: "internal",
    ticket: e.ticket ?? "",
    task: e.taskTitle,
    tag: e.tag ?? "",
    tags: e.tag ?? "",
    notes: e.note ?? "",
  };
}

function groupRows(rows: FlatRow[], grouping: Grouping): FlatRow[] {
  if (grouping === "entry") return rows;
  const map = new Map<string, FlatRow>();
  for (const r of rows) {
    const key =
      grouping === "task"
        ? `${r.date}::${r.project}::${r.task}`
        : `${r.date}::${r.project}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...r });
    } else {
      const sum = parseFloat(prev.duration) + parseFloat(r.duration);
      map.set(key, {
        ...prev,
        duration: sum.toFixed(2),
        end: "",
        start: "",
        task: grouping === "proj" ? "" : prev.task,
        ticket: grouping === "proj" ? "" : prev.ticket,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function exportCsv(
  input: ExportInput,
  parent?: BrowserWindow,
): Promise<{ path: string | null; rows: number; filename: string }> {
  const { from, to } = rangeToDates(input.range, input.from, input.to);
  const list = entries.list({ from, to });
  const now = Date.now();
  const flat = list.map((e) => entryToFlat(e, now));
  const grouped = groupRows(flat, input.grouping);

  const cols = (
    input.columns.length ? input.columns : presetColumns(input.preset)
  ).filter((c) => COLUMN_ORDER.includes(c as ColumnId)) as ColumnId[];

  const header = cols.join(",");
  const body = grouped
    .map((r) => cols.map((c) => escapeCsv(r[c] ?? "")).join(","))
    .join("\n");
  const csv = `${header}\n${body}\n`;

  const filename = `attensi-${input.range}-${fmtDate(now)}.csv`;
  const result = await dialog.showSaveDialog(
    parent ??
      BrowserWindow.getFocusedWindow() ??
      new BrowserWindow({ show: false }),
    {
      title: "Export time entries",
      defaultPath: filename,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    },
  );

  if (result.canceled || !result.filePath) {
    return { path: null, rows: grouped.length, filename };
  }
  writeFileSync(result.filePath, csv, "utf8");
  return { path: result.filePath, rows: grouped.length, filename };
}
