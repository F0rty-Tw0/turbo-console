import type { TurboException } from '@turbo-console/core';

import { logTextOf } from '../../../shared/utils/log-text.util.ts';
import type { LoadFailure } from '../../common/root.type.ts';

/** A failed load as `loadRoot` returns it for `error` thrown as is. */
export const loadFailureOf = (stage: LoadFailure['stage'], error: TurboException): LoadFailure => {
  const failure: LoadFailure = { kind: 'error', stage, error, logText: logTextOf(error) };

  return failure;
};
