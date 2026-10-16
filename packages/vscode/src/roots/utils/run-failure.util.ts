import { TurboException } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { LoadFailure } from '../common/root.type.ts';

/** A run port that broke its never-throws contract: its error becomes a failed load, as one clean line with no cause. */
export const runFailureOf = (error: unknown): LoadFailure => {
  const logText = logTextOf(error);
  const exception = new TurboException('failed', logText);
  const failure: LoadFailure = { kind: 'error', stage: 'load', error: exception, logText };

  return failure;
};
