const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_MODULUS = 2 ** 32;

/** A repeatable generator: each call returns an integer in `[0, bound)`. */
export const seededNext = (start: number): ((bound: number) => number) => {
  let seed = start;

  return (bound) => {
    seed = (seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;

    return Math.floor((seed / LCG_MODULUS) * bound);
  };
};
