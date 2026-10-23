import type { BenchSample } from '../../common/bench.type.ts';

/** One ungated 1 ms sample of row `a`, written as `webview-ui/a`. */
export const BENCH_SAMPLE_STUB: BenchSample = { name: 'a', ms: 1, gate: false };
