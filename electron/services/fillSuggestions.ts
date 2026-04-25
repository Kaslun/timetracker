import type { FillSuggestion } from '../shared/models';

/**
 * Mocked fill-gaps suggestions, sourced from the design's DATA.fillSuggestions.
 * In v2 these would come from real app activity polling (active window, browser
 * tabs, calendar events, etc).
 */
const SEED: Omit<FillSuggestion, 'id'>[] = [
  { at: '10:45', src: 'Teams',   label: 'Design sync — tracker v2',          meta: '55 min · recurring', confidence: 0.92, picked: true,  durationMinutes: 55, taskId: 'tsk_dsync'  },
  { at: '12:10', src: 'Slack',   label: 'Threaded reply · #eng-platform',    meta: '14 messages',        confidence: 0.71, picked: true,  durationMinutes: 14, taskId: 'tsk_ops'    },
  { at: '13:02', src: 'Linear',  label: 'ATT-412 · moved to In Review',      meta: 'you · 2m',           confidence: 0.85, picked: false, durationMinutes: 2,  taskId: 'tsk_att412' },
  { at: '13:40', src: 'VS Code', label: 'mobile-runtime/branching.ts',       meta: '42 min active',      confidence: 0.88, picked: true,  durationMinutes: 42, taskId: 'tsk_att412' },
  { at: '14:30', src: 'Chrome',  label: 'PR #2041 on GitHub',                meta: '28 min focus',       confidence: 0.66, picked: false, durationMinutes: 28, taskId: 'tsk_pr'     },
];

export function getFillSuggestions(): FillSuggestion[] {
  return SEED.map((s, i) => ({ ...s, id: `fill_${i}` }));
}
