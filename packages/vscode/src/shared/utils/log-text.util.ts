import { TurboException } from '@turbo-console/core';

import { cleanLines } from './clean-text.util.ts';
import { LOG_LINE_MAX } from '../common/text.const.ts';

const UNPRINTABLE = 'unprintable error';

/** Every line after the first is indented, so none can start with a timestamp and pass as a log entry of its own. */
const CONTINUATION = '\n    ';

const rawLogTextOf = (error: unknown): string => {
  if (error instanceof TurboException) return `turbo ${error.kind}: ${error.message}`;

  const isTextError = error instanceof Error && typeof error.message === 'string';

  if (isTextError) return error.message;

  return String(error);
};

/**
 * One log entry for an error, its lines kept and indented after the first, cut to `LOG_LINE_MAX`; never reads `cause`,
 * which can hold turbo's raw stderr. Never throws: a revoked proxy, a throwing `message` getter or `toString`, or a
 * null-prototype object logs `UNPRINTABLE`.
 */
export const logTextOf = (error: unknown): string => {
  try {
    const indented = rawLogTextOf(error).replaceAll('\n', CONTINUATION);

    return cleanLines(indented, LOG_LINE_MAX);
  } catch {
    return UNPRINTABLE;
  }
};
