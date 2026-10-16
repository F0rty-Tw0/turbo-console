import { errorKeyOf } from './error-key.util.ts';
import type { LoadFailure, LoadResult } from '../common/root.type.ts';

/**
 * The log line of a failed load whose error key or log text differs from the root's `current` error; `null` for a model
 * or a repeat. Every turbo-side failure shares the key `load:failed`, so the text tells a new mistake from a retry. A
 * model clears the root's error, so the same failure after it is logged again.
 */
export const newFailureLineOf = (current: LoadFailure | null, result: LoadResult): string | null => {
  if (result.kind === 'model') return null;

  const currentKey = errorKeyOf(current);
  const resultKey = errorKeyOf(result);
  const isSameKey = currentKey === resultKey;
  const isSameText = current?.logText === result.logText;

  if (isSameKey && isSameText) return null;

  return result.logText;
};
