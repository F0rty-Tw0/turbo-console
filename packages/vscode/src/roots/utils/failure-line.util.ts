import { errorKeyOf } from './error-key.util.ts';
import type { LoadFailure, LoadResult } from '../common/root.type.ts';

/**
 * The log line of a failed load whose error key differs from the root's `current` error; `null` for a model or a repeat.
 * A model clears the root's error, so the same failure after it is logged again.
 */
export const newFailureLineOf = (current: LoadFailure | null, result: LoadResult): string | null => {
  if (result.kind === 'model') return null;

  const currentKey = errorKeyOf(current);
  const resultKey = errorKeyOf(result);
  const isRepeat = currentKey === resultKey;

  if (isRepeat) return null;

  return result.logText;
};
