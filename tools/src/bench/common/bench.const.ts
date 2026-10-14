/** Untimed calls before sampling, so lazy compilation and caches settle first. */
export const WARMUP = 3;

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
