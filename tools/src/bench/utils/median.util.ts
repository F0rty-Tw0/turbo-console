const ascending = (left: number, right: number): number => left - right;

/** Middle value of `values` (mean of the two middle values for an even count); throws on an empty list. */
export const median = (values: number[]): number => {
  const sorted = values.toSorted(ascending);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];

  if (upper === undefined) throw new Error('median of no values');

  const isOdd = sorted.length % 2 === 1;

  if (isOdd) return upper;

  const lower = sorted[middle - 1] ?? upper;

  return (lower + upper) / 2;
};
