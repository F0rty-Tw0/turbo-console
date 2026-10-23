import type { BenchRowDef } from './common/bench.type.ts';

type BenchRowKey = 'openCold' | 'openCached' | 'panCpu' | 'panP95' | 'openColdLarge' | 'panCpuLarge' | 'toggleLarge';

const OPEN_COLD: BenchRowDef = { name: 'graph open cold target-like', gate: false, samples: 7 };
const OPEN_CACHED: BenchRowDef = { name: 'graph open cached target-like', gate: false, samples: 7 };
const PAN_CPU: BenchRowDef = { name: 'graph pan cpu target-like', gate: false, samples: 5 };
const PAN_P95: BenchRowDef = { name: 'graph pan p95 frame target-like', gate: false, samples: 5 };
const OPEN_COLD_LARGE: BenchRowDef = { name: 'graph open cold large grouped', gate: false, samples: 3 };
const PAN_CPU_LARGE: BenchRowDef = { name: 'graph pan cpu large grouped', gate: false, samples: 3 };
const TOGGLE_LARGE: BenchRowDef = { name: 'graph folder toggle large', gate: false, samples: 3 };

/** Rows of spec 3.1 in order; the bench job writes each as `webview-ui/<name>`. */
export const BENCH_ROWS: Readonly<Record<BenchRowKey, BenchRowDef>> = {
  openCold: OPEN_COLD,
  openCached: OPEN_CACHED,
  panCpu: PAN_CPU,
  panP95: PAN_P95,
  openColdLarge: OPEN_COLD_LARGE,
  panCpuLarge: PAN_CPU_LARGE,
  toggleLarge: TOGGLE_LARGE
};

/** The median of the longest long task of each target-like pan stays within this. */
export const LONG_TASK_BUDGET_MS = 50;
