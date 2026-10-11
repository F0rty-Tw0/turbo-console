/** mulberry32: a seeded generator of floats in [0, 1); the same seed yields the same sequence. */
export const createPrng = (seed: number): (() => number) => {
  let state = seed;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;

    let mixed = Math.imul(state ^ (state >>> 15), state | 1);

    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };

  return next;
};

/** Picks `count` distinct items in random order without mutating `items`. */
export const pickRandom = <TItem>(items: TItem[], count: number, random: () => number): TItem[] => {
  const pool = [...items];
  const picked: TItem[] = [];

  for (let step = 0; step < count; step++) {
    const index = Math.floor(random() * pool.length);
    const removed = pool.splice(index, 1);

    picked.push(...removed);
  }

  return picked;
};
