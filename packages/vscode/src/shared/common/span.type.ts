/** Two `performance.now()` readings; `end` stays `null` until the measured step finishes. */
export type Span = {
  readonly start: number;
  readonly end: number | null;
};
