import type { BenchRowDef } from './bench.type.ts';

type StretchRowKey = 'smallOpen' | 'smallPan' | 'mediumPan' | 'mediumToggle' | 'largePan';

const SMALL_OPEN: BenchRowDef = { name: 'graph stretch S task open', gate: false, samples: 3 };
const SMALL_PAN: BenchRowDef = { name: 'graph stretch S pan frame', gate: false, samples: 3 };
const MEDIUM_PAN: BenchRowDef = { name: 'graph stretch M pan frame', gate: false, samples: 3 };
const MEDIUM_TOGGLE: BenchRowDef = { name: 'graph stretch M toggle', gate: false, samples: 3 };
const LARGE_PAN: BenchRowDef = { name: 'graph stretch L pan frame', gate: false, samples: 3 };

/**
 * The stretch rows of spec 5: 300 packages, 1500 tasks, 20 groups of 200 files; S has every group collapsed, M five expanded, L all 20.
 * They record without gating and run only under `playwright.stretch.config.ts`, so the CI bench job never sees them.
 * Open and toggle rows are ms; the pan rows are the median frame time in ms (FPS = 1000 / ms).
 */
export const STRETCH_ROWS: Readonly<Record<StretchRowKey, BenchRowDef>> = {
  smallOpen: SMALL_OPEN,
  smallPan: SMALL_PAN,
  mediumPan: MEDIUM_PAN,
  mediumToggle: MEDIUM_TOGGLE,
  largePan: LARGE_PAN
};

/** Umbrellas expanded before the M rows are measured; the next one is the M toggle's. */
export const MEDIUM_EXPANDED = 5;

/** A collapsed umbrella must render at least this wide to be tapped; below it the run zooms onto it first. */
export const MIN_TAP_PX = 4;
