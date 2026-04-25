export type ThemeId = "warm" | "clin" | "paper" | "term" | "mid" | "ember";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  group: "Light" | "Dark";
  desc: string;
  bg: string;
  surface: string;
  accent: string;
  ink: string;
  font: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "warm",
    label: "Warm",
    group: "Light",
    desc: "Cream · terracotta · Instrument Serif",
    bg: "#f6f2ec",
    surface: "#ffffff",
    accent: "#b8633a",
    ink: "#1f1a16",
    font: "Instrument Serif",
  },
  {
    id: "clin",
    label: "Clinical",
    group: "Light",
    desc: "Slate · indigo · Inter Tight",
    bg: "#f7f8fa",
    surface: "#ffffff",
    accent: "#5b5bd6",
    ink: "#0f1420",
    font: "Inter Tight",
  },
  {
    id: "paper",
    label: "Paper",
    group: "Light",
    desc: "Off-white · navy · editorial",
    bg: "#f5f5f2",
    surface: "#ffffff",
    accent: "#1d4ed8",
    ink: "#111827",
    font: "Inter Tight",
  },
  {
    id: "term",
    label: "Terminal",
    group: "Dark",
    desc: "Graphite · phosphor · JetBrains Mono",
    bg: "#0d0f12",
    surface: "#181c22",
    accent: "#7fd67a",
    ink: "#e6ebe2",
    font: "JetBrains Mono",
  },
  {
    id: "mid",
    label: "Midnight",
    group: "Dark",
    desc: "Deep navy · periwinkle · Inter",
    bg: "#0a0e1a",
    surface: "#131929",
    accent: "#7c8cff",
    ink: "#e2e8f5",
    font: "Inter",
  },
  {
    id: "ember",
    label: "Ember",
    group: "Dark",
    desc: "Charcoal · amber · serif accents",
    bg: "#12100e",
    surface: "#211d19",
    accent: "#f59e42",
    ink: "#f2ece4",
    font: "Instrument Serif",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function applyTheme(
  id: ThemeId,
  root: HTMLElement = document.body,
): void {
  const all: ThemeId[] = ["warm", "clin", "paper", "term", "mid", "ember"];
  for (const t of all) root.classList.remove(`dir-${t}`);
  root.classList.add(`dir-${id}`);
}
