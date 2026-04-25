export interface ServiceMeta {
  id: string;
  label: string;
  bg: string;
  letter: string;
  meta: string;
}

export const SERVICES: ServiceMeta[] = [
  {
    id: "linear",
    label: "Linear",
    bg: "#5e6ad2",
    letter: "L",
    meta: "issues · tickets",
  },
  {
    id: "jira",
    label: "Jira",
    bg: "#2684ff",
    letter: "J",
    meta: "tickets · epics",
  },
  {
    id: "asana",
    label: "Asana",
    bg: "#f06a6a",
    letter: "A",
    meta: "tasks · projects",
  },
  {
    id: "slack",
    label: "Slack",
    bg: "#4a154b",
    letter: "#",
    meta: "status · DMs",
  },
  {
    id: "teams",
    label: "Teams",
    bg: "#5059c9",
    letter: "T",
    meta: "meetings · calls",
  },
  {
    id: "github",
    label: "GitHub",
    bg: "#1a1e22",
    letter: "◐",
    meta: "PRs · commits",
  },
  {
    id: "gcal",
    label: "Google Calendar",
    bg: "#4285f4",
    letter: "◎",
    meta: "events · blocks",
  },
  {
    id: "notion",
    label: "Notion",
    bg: "#111111",
    letter: "N",
    meta: "docs · databases",
  },
];
