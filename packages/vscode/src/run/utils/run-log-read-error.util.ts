import { RUN_LOG_RETRYABLE_READ_CODES } from '../common/run-log-tail.const.ts';

/** True when a log read failed with an error worth retrying on the next change, false for any other error. */
export const isRetryableReadError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && RUN_LOG_RETRYABLE_READ_CODES.has(error.code);
