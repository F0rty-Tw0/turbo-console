import { DOUBLE_TAP_MS } from '../common/graph.const.ts';

/**
 * A double-tap detector: each call records a tap on `id` at `at` ms (`null`: anything that never double taps) and says
 * whether it completes a double tap, two taps on the same id within `DOUBLE_TAP_MS`. A completed pair is spent, so a
 * third tap starts a new one; a clock that steps back never pairs.
 */
export const tapPairOf = (): ((id: string | null, at: number) => boolean) => {
  let lastId: string | null = null;
  let lastTapAt = Number.NEGATIVE_INFINITY;

  const noteTap = (id: string | null, at: number): boolean => {
    const gap = at - lastTapAt;
    const isDouble = id !== null && id === lastId && gap >= 0 && gap <= DOUBLE_TAP_MS;

    lastId = isDouble ? null : id;
    lastTapAt = at;

    return isDouble;
  };

  return noteTap;
};
