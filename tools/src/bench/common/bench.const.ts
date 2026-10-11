/** Untimed calls before sampling, so lazy compilation and caches settle first. */
export const WARMUP = 3;

/** Timed calls per bench; the result is their median. */
export const SAMPLES = 25;

/** Bench files, relative to the package dir the runner starts in. */
export const BENCH_GLOB = 'src/**/test/*.bench.ts';

/** Results land in `<package dir>/.bench/results.json`. */
export const BENCH_DIR = '.bench';

export const RESULTS_FILE = 'results.json';
