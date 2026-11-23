import type { BenchRowDef } from './bench.type.ts';

type TenKRowKey =
  | 'flatOpen'
  | 'flatPan'
  | 'flatZoom'
  | 'groupedOpen'
  | 'groupedPan'
  | 'expandedPan'
  | 'groupedToggle'
  | 'taskOpen'
  | 'taskPan'
  | 'modulesOpen'
  | 'modulesPan';

const FLAT_OPEN: BenchRowDef = { name: 'graph 10k flat open', gate: false, samples: 3 };
const FLAT_PAN: BenchRowDef = { name: 'graph 10k flat pan p95 frame', gate: false, samples: 3 };
const FLAT_ZOOM: BenchRowDef = { name: 'graph 10k flat zoom p95 frame', gate: false, samples: 3 };
const GROUPED_OPEN: BenchRowDef = { name: 'graph 10k grouped collapsed open', gate: false, samples: 3 };
const GROUPED_PAN: BenchRowDef = { name: 'graph 10k grouped collapsed pan p95 frame', gate: false, samples: 3 };
const EXPANDED_PAN: BenchRowDef = { name: 'graph 10k grouped expanded pan p95 frame', gate: false, samples: 3 };
const GROUPED_TOGGLE: BenchRowDef = { name: 'graph 10k grouped folder toggle', gate: false, samples: 3 };
const TASK_OPEN: BenchRowDef = { name: 'graph 10k task open', gate: false, samples: 3 };
const TASK_PAN: BenchRowDef = { name: 'graph 10k task pan p95 frame', gate: false, samples: 3 };
const MODULES_OPEN: BenchRowDef = { name: 'graph 10k modules open at file cap', gate: false, samples: 3 };
const MODULES_PAN: BenchRowDef = { name: 'graph 10k modules pan p95 frame at file cap', gate: false, samples: 3 };

/**
 * The 10k rows: 10,000 packages flat and in 50 folders of 200, 10,000 tasks (2000 packages of five) with Show every task,
 * and the modules view at its 5000-file scan cap. The targets are a first frame of 3 s or less and a p95 frame of 33.3 ms
 * or less (30 fps) while panning, zooming or expanding. Like the stretch rows they record without gating and run only
 * under `playwright.stretch.config.ts`. Open and toggle rows are ms; pan and zoom rows are the p95 frame time in ms.
 */
export const TEN_K_ROWS: Readonly<Record<TenKRowKey, BenchRowDef>> = {
  flatOpen: FLAT_OPEN,
  flatPan: FLAT_PAN,
  flatZoom: FLAT_ZOOM,
  groupedOpen: GROUPED_OPEN,
  groupedPan: GROUPED_PAN,
  expandedPan: EXPANDED_PAN,
  groupedToggle: GROUPED_TOGGLE,
  taskOpen: TASK_OPEN,
  taskPan: TASK_PAN,
  modulesOpen: MODULES_OPEN,
  modulesPan: MODULES_PAN
};

/** How long one 10k sample may wait for a layout, a first frame or a toggle frame before it fails as a timeout. */
export const TEN_K_SETTLE_MS = 600_000;
