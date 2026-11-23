const MODULUS = 2147483647;

const MULTIPLIER = 48271;

/** A Park-Miller generator: numbers in [0, 1), the same for the same seed in [1, 2147483646]. */
export const seededRandomOf = (seed: number): (() => number) => {
  let state = seed;
  const next = (): number => {
    state = (state * MULTIPLIER) % MODULUS;

    return (state - 1) / (MODULUS - 1);
  };

  return next;
};
