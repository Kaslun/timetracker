import { projects } from "./repos/projects";
import { tasks } from "./repos/tasks";
import { entries } from "./repos/entries";
import { captures } from "./repos/captures";
import { startOfDay } from "./utils";
import { db } from "./index";

/**
 * Seed projects + tasks based on hifi-data.jsx so the app shows real-feeling
 * content from first launch instead of an empty void.
 *
 * Idempotent: only runs once (guarded by a row count check).
 */
export function seedIfEmpty(): void {
  const r = db().prepare("SELECT COUNT(*) AS n FROM projects").get() as {
    n: number;
  };
  if (r.n > 0) return;

  const SEED_PROJECTS = [
    {
      id: "prj_mobile",
      name: "Mobile Runtime",
      color: "#b8633a",
      ticketPrefix: "ATT",
    },
    {
      id: "prj_planning",
      name: "Planning",
      color: "#c9a93a",
      ticketPrefix: null,
    },
    { id: "prj_design", name: "Design", color: "#6a9d88", ticketPrefix: null },
    {
      id: "prj_platform",
      name: "Platform",
      color: "#5b7ab8",
      ticketPrefix: "ATT",
    },
    { id: "prj_hiring", name: "Hiring", color: "#d47aa3", ticketPrefix: null },
    { id: "prj_ops", name: "Ops", color: "#8a8a8a", ticketPrefix: null },
    { id: "prj_growth", name: "Growth", color: "#8a8a8a", ticketPrefix: null },
    { id: "prj_sales", name: "Sales", color: "#b8633a", ticketPrefix: null },
  ] as const;

  for (const p of SEED_PROJECTS) {
    projects.create({
      id: p.id,
      name: p.name,
      color: p.color,
      ticketPrefix: p.ticketPrefix,
      integrationId: null,
      archivedAt: null,
    });
  }

  const SEED_TASKS = [
    {
      id: "tsk_att412",
      projectId: "prj_mobile",
      ticket: "ATT-412",
      title: "Fix scenario branching on iOS simulator",
      tag: "dev",
    },
    {
      id: "tsk_doc88",
      projectId: "prj_planning",
      ticket: "DOC-88",
      title: "Draft Q2 planning memo",
      tag: "write",
    },
    {
      id: "tsk_dsync",
      projectId: "prj_design",
      ticket: null,
      title: "Design sync — time tracker v2",
      tag: "meet",
    },
    {
      id: "tsk_att391",
      projectId: "prj_platform",
      ticket: "ATT-391",
      title: "Refactor auth middleware on learning-api",
      tag: "dev",
    },
    {
      id: "tsk_hire",
      projectId: "prj_hiring",
      ticket: null,
      title: "Interview · M. Okafor (staff iOS)",
      tag: "meet",
    },
    {
      id: "tsk_ops",
      projectId: "prj_ops",
      ticket: null,
      title: "Triage #infra inbox",
      tag: "ops",
    },
    {
      id: "tsk_att405",
      projectId: "prj_mobile",
      ticket: "ATT-405",
      title: "Scenario save-load repro",
      tag: "dev",
    },
    {
      id: "tsk_att410",
      projectId: "prj_mobile",
      ticket: "ATT-410",
      title: "Animation bug · iOS 17",
      tag: "dev",
    },
    {
      id: "tsk_pr",
      projectId: "prj_platform",
      ticket: null,
      title: "Code review · 3 PRs",
      tag: "ops",
    },
  ] as const;

  for (const t of SEED_TASKS) {
    tasks.create({
      id: t.id,
      projectId: t.projectId,
      ticket: t.ticket,
      title: t.title,
      tag: t.tag,
    });
  }

  // ── Entries: build today's timeline + a couple of recent days so the
  // dashboard's weekly chart and the timeline tab feel populated.
  const HOUR = 60 * 60 * 1000;
  const today = startOfDay(Date.now());
  const yday = today - 24 * HOUR;
  const dayB = today - 2 * 24 * HOUR;

  // Helper: schedule an entry h hours into a given day for `len` hours
  const sched = (
    day: number,
    h: number,
    lenHours: number,
    taskId: string,
    source: "manual" | "fill" = "manual",
  ): void => {
    const start = day + h * HOUR;
    entries.insert({
      taskId,
      startedAt: start,
      endedAt: start + lenHours * HOUR,
      source,
    });
  };

  // ── Two days ago (Mon-ish) — about 7.2h
  sched(dayB, 9.2, 1.5, "tsk_att405");
  sched(dayB, 10.75, 1.25, "tsk_doc88");
  sched(dayB, 13.17, 1.33, "tsk_att405");
  sched(dayB, 14.6, 1.2, "tsk_dsync");
  sched(dayB, 16.0, 1.0, "tsk_pr");

  // ── Yesterday (Tue-ish) — about 8.1h
  sched(yday, 9.0, 1.5, "tsk_att410");
  sched(yday, 10.58, 0.92, "tsk_dsync");
  sched(yday, 13.0, 2.5, "tsk_att410");
  sched(yday, 15.6, 1.8, "tsk_doc88");
  sched(yday, 17.5, 1.4, "tsk_pr");

  // ── Today: timeline blocks from hifi-data.jsx (best fit, in past hours only)
  // We seed only entries before "now" so live state is consistent.
  const now = Date.now();
  const seedToday = (h: number, lenHours: number, taskId: string): void => {
    const start = today + h * HOUR;
    const end = start + lenHours * HOUR;
    if (end > now) return; // skip future blocks
    entries.insert({
      taskId,
      startedAt: start,
      endedAt: end,
      source: "manual",
    });
  };
  seedToday(8.2, 0.5, "tsk_dsync"); // Standup
  seedToday(9.0, 1.3, "tsk_att410"); // animation bug
  seedToday(10.7, 0.8, "tsk_pr"); // code review
  seedToday(11.6, 0.4, "tsk_ops"); // lunch -> ops as a stand-in
  seedToday(12.2, 1.6, "tsk_dsync"); // design sync

  // Captures (brain dump inbox)
  const minute = 60 * 1000;
  const seedCaps = [
    { text: "check if backoff wraps on 500s", tag: null, ago: 2 * minute },
    {
      text: "ask ana: are we reusing the old scenario icons?",
      tag: "#design",
      ago: 12 * minute,
    },
    {
      text: "followup — slack thread with eng-mgr re: staffing",
      tag: null,
      ago: 24 * minute,
    },
    {
      text: "write up the reliability findings for friday review",
      tag: "#write",
      ago: 60 * minute,
    },
    {
      text: "schedule 1:1 with sam before sprint end",
      tag: "#admin",
      ago: 24 * 60 * minute,
    },
  ];
  for (const c of seedCaps) {
    const cap = captures.create({ text: c.text, tag: c.tag });
    db()
      .prepare("UPDATE captures SET created_at = ? WHERE id = ?")
      .run(now - c.ago, cap.id);
  }
}
