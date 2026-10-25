import type { BenchRowDef } from './bench.type.ts';
import { WIDGET_BUTTON_PX } from '../../../src/graph/common/graph.const.ts';

type StretchRowKey = 'smallOpen' | 'smallPan' | 'mediumPan' | 'mediumToggle' | 'largePan';

const SMALL_OPEN: BenchRowDef = { name: 'graph stretch S task open', gate: false, samples: 3 };
const SMALL_PAN: BenchRowDef = { name: 'graph stretch S pan p95 frame', gate: false, samples: 3 };
const MEDIUM_PAN: BenchRowDef = { name: 'graph stretch M pan p95 frame', gate: false, samples: 3 };
const MEDIUM_TOGGLE: BenchRowDef = { name: 'graph stretch M toggle', gate: false, samples: 3 };
const LARGE_PAN: BenchRowDef = { name: 'graph stretch L pan p95 frame', gate: false, samples: 3 };

/**
 * The stretch rows of spec 5: 300 packages, 1500 tasks, 20 groups of 200 files; S has every group collapsed, M five expanded, L all 20.
 * They record without gating and run only under `playwright.stretch.config.ts`, so the CI bench job never sees them.
 * Open and toggle rows are ms; the pan rows are the p95 frame time in ms (FPS = 1000 / ms), since the median of a vsync-bound
 * pan reads 16.7 ms however slow the graph is.
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

/**
 * A collapsed umbrella must render at least this wide to be double tapped; below it the run zooms onto it first. The first tap
 * selects it and puts the 24 px "…" over its top-right corner, which covers the centre of any node under 24 px wide, so the
 * second tap would land on the button; the extra 8 px keeps the centre clear of it.
 */
export const MIN_TAP_PX = WIDGET_BUTTON_PX + 8;

/** Double taps tried before a group that stays as it was fails the run. */
export const MAX_TAP_ATTEMPTS = 3;

/**
 * How long a double tap has to flip the group's box before the next attempt. Under CPU load the 5000 node canvas can hold a
 * mouse down for 400 ms or more, and Cytoscape then drops the tap pair, so the group does not toggle at all.
 */
export const TAP_SETTLE_MS = 8000;
