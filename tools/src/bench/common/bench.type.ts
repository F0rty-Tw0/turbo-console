/** `gate: true` lets the CI compare step fail the build when this bench regresses past the threshold. */
export type BenchOptions = {
  readonly gate: boolean;
};

/** How long `sampleBench` calls a bench untimed: at least `calls` times and at least `ms` milliseconds. */
export type Warmup = {
  readonly calls: number;
  readonly ms: number;
};

/** One entry of a `*.bench.ts` file's default export; `fn` may return a promise, which the sampler awaits. */
export type BenchDescriptor = {
  readonly name: string;
  readonly fn: () => unknown;
  readonly gate: boolean;
};

/** One row of `.bench/results.json`; `name` is `<package dir>/<bench name>`. */
export type BenchResult = {
  readonly name: string;
  readonly medianNs: number;
  readonly samples: number;
  readonly gate: boolean;
};

/** One bench present on both sides; `ratio` is `headNs / baseNs`, `gate` is set when either side gates it; `failed` means gated and slower than the threshold allows. */
export type ComparisonRow = {
  readonly name: string;
  readonly baseNs: number;
  readonly headNs: number;
  readonly ratio: number;
  readonly gate: boolean;
  readonly failed: boolean;
};

/**
 * Head against base: shared benches as rows, plus names only head has (`added`) or only base has (`removed`).
 * `missingGated` lists base's gated benches when none of them is on head, which fails the comparison.
 */
export type BenchComparison = {
  readonly rows: ComparisonRow[];
  readonly added: string[];
  readonly removed: string[];
  readonly missingGated: string[];
  readonly failed: boolean;
};
