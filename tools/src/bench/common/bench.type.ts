/** `gate: true` lets the CI compare step fail the build when this bench regresses past the threshold. */
export type BenchOptions = {
  readonly gate: boolean;
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
