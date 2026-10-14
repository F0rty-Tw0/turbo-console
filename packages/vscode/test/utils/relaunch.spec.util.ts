import { MAX_TIMING_ATTEMPTS } from '../common/launch.const.ts';

/**
 * Whether a failed launch attempt runs again: only on CI, where one wall-clock sample on a shared runner is noisy, only
 * when its suite recorded a timing miss, so a functional failure never retries, and only while attempts remain, so a
 * real regression still fails every one.
 */
export const shouldRelaunch = (attempt: number, isCi: boolean, hasMiss: boolean): boolean => {
  const hasAttemptsLeft = attempt < MAX_TIMING_ATTEMPTS;

  return isCi && hasMiss && hasAttemptsLeft;
};
