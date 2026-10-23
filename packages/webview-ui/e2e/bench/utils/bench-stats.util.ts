const byNumber = (left: number, right: number): number => left - right;

const sortedOf = (values: number[]): number[] => {
  const copy = [...values];

  return copy.sort(byNumber);
};

export const median = (values: number[]): number => {
  const sorted = sortedOf(values);
  const lower = sorted.at(Math.floor((sorted.length - 1) / 2));
  const upper = sorted.at(Math.floor(sorted.length / 2));

  if (lower === undefined || upper === undefined) throw new Error('median of no values');

  return (lower + upper) / 2;
};

export const p95 = (values: number[]): number => {
  const sorted = sortedOf(values);
  const picked = sorted.at(Math.floor(0.95 * sorted.length));

  if (picked === undefined) throw new Error('p95 of no values');

  return picked;
};
