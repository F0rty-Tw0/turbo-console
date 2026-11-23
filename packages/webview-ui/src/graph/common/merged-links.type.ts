/** Where a link is drawn: the ids of its two drawn ends. */
export type DrawnEnds = {
  readonly source: string;
  readonly target: string;
};

/** The items that share one pair of drawn ends, folded into `value`. */
export type MergedLink<TValue> = {
  readonly source: string;
  readonly target: string;
  readonly value: TValue;
};
