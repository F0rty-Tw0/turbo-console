import { isWithin } from '@turbo-console/core';

import { unsafeScriptText } from './run-text.util.ts';
import { isSafeScriptName } from './script-name.util.ts';
import { NOT_TURBO_FORCE_TEXT } from '../common/run.const.ts';
import type { RunRequest } from '../common/run.type.ts';

/**
 * Spec 1c-b §4.3: why `request` must not run, as the text to show, or `null`. A turbo task is never refused. A script is
 * refused for a name that needs quoting (the allowlist is what makes plain launch args safe), for a package dir outside
 * the root, and for Run Without Cache.
 */
export const refusalOf = (request: RunRequest): string | null => {
  const { task } = request;

  if (task.isTurboTask) return null;

  const isSafeName = isSafeScriptName(task.name);
  const isInRoot = isWithin(request.root, request.packageDir);
  const isSafe = isSafeName && isInRoot;

  if (!isSafe) return unsafeScriptText(task.name);

  if (request.force) return NOT_TURBO_FORCE_TEXT;

  return null;
};
