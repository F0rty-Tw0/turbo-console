import type { Warmup } from './bench.type.ts';

/**
 * Untimed calls before sampling, so lazy compilation and caches settle first: at least `calls`, and for at least `ms`.
 * A sub-millisecond bench is still being optimized after 3 calls, so its median then depends on when V8 tiered up in
 * that process: 3 calls alone spread the median of a 0.2 ms tree bench 1.5-1.6x across fresh processes and failed the
 * CI gate on unchanged code; 300 ms keeps it within 1.1x (pinned probe, 2026-10-20). A 10 ms bench needs longer: after
 * 300 ms `parse-package-graph-stretch-300` still settled at 9.6 or 11.0 ms per process (1.17x apart), after 1000 ms within
 * 1.03x (12 fresh pinned processes each). A bench slower than ~330 ms stops after `calls`.
 */
export const WARMUP: Warmup = { calls: 3, ms: 1000 };

/** Timed calls per bench; the result is their median. */
export const SAMPLES = 25;

/** Bench files, relative to the package dir the runner starts in. */
export const BENCH_GLOB = 'src/**/test/*.bench.ts';

/** Results land in `<package dir>/.bench/results.json`. */
export const BENCH_DIR = '.bench';

export const RESULTS_FILE = 'results.json';

/** A gated bench fails when its fastest head run median is more than this fraction above its fastest base run median. */
export const THRESHOLD = 0.15;

export const NS_PER_MS = 1_000_000;
