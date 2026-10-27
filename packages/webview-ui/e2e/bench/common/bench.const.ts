import type { BenchRowDef } from './bench.type.ts';
import type { GraphOptions } from '../../common/graph.type.ts';

type BenchRowKey =
  | 'openCold'
  | 'openCached'
  | 'panCpu'
  | 'panP95'
  | 'openColdLarge'
  | 'panCpuLarge'
  | 'toggleLarge'
  | 'taskOpen'
  | 'taskPanCpu'
  | 'openColdDefault'
  | 'panCpuDefault';

const OPEN_COLD: BenchRowDef = { name: 'graph open cold target-like', gate: true, samples: 7 };
const OPEN_CACHED: BenchRowDef = { name: 'graph open cached target-like', gate: true, samples: 7 };
const PAN_CPU: BenchRowDef = { name: 'graph pan cpu target-like', gate: true, samples: 5 };
const PAN_P95: BenchRowDef = { name: 'graph pan p95 frame target-like', gate: true, samples: 5 };
const OPEN_COLD_LARGE: BenchRowDef = { name: 'graph open cold large grouped', gate: false, samples: 3 };
const PAN_CPU_LARGE: BenchRowDef = { name: 'graph pan cpu large grouped', gate: false, samples: 3 };
const TOGGLE_LARGE: BenchRowDef = { name: 'graph folder toggle large', gate: false, samples: 3 };
const TASK_OPEN: BenchRowDef = { name: 'graph task open target-like', gate: false, samples: 3 };
const TASK_PAN_CPU: BenchRowDef = { name: 'graph task pan cpu target-like', gate: false, samples: 3 };
const OPEN_COLD_DEFAULT: BenchRowDef = { name: 'graph open cold target-like default', gate: true, samples: 7 };
const PAN_CPU_DEFAULT: BenchRowDef = { name: 'graph pan cpu target-like default', gate: true, samples: 5 };

/**
 * Rows of spec 3.1 in order, then the two task-mode rows, which record without gating until a CI baseline exists, then
 * the two rows of the default first open: the target-like graph with nothing saved, which opens grouped.
 * The bench job writes each as `webview-ui/<name>`.
 * The open rows time message receipt to the first render after layout; the page load is not in them.
 */
export const BENCH_ROWS: Readonly<Record<BenchRowKey, BenchRowDef>> = {
  openCold: OPEN_COLD,
  openCached: OPEN_CACHED,
  panCpu: PAN_CPU,
  panP95: PAN_P95,
  openColdLarge: OPEN_COLD_LARGE,
  panCpuLarge: PAN_CPU_LARGE,
  toggleLarge: TOGGLE_LARGE,
  taskOpen: TASK_OPEN,
  taskPanCpu: TASK_PAN_CPU,
  openColdDefault: OPEN_COLD_DEFAULT,
  panCpuDefault: PAN_CPU_DEFAULT
};

/** Page options of a first open: nothing saved, so the page starts from its defaults. */
export const NOTHING_SAVED: GraphOptions = { savedState: null };

/** The median of the longest long task of each target-like pan stays within this. */
export const LONG_TASK_BUDGET_MS = 50;

export const BENCH_PREFIX = 'webview-ui/';

/** The characters a bench row name may hold, prefix included. */
export const ROW_NAME = /^[\w@./ -]+$/u;

export const NS_PER_MS = 1_000_000;

/** Frames a scripted pan waits before it drags. */
export const WARM_UP_FRAMES = 30;

/** Frames a scripted pan drags for, one step each: 2 s at 60 Hz. */
export const PAN_FRAMES = 120;
