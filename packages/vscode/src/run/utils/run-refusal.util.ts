import { isWithin } from '@turbo-console/core';
import type { TaskNode } from '@turbo-console/core';

import { unsafeScriptText } from './run-text.util.ts';
import { isSafeScriptName } from './script-name.util.ts';
import { NOT_TURBO_FORCE_TEXT } from '../common/run.const.ts';
import type { RunRequest } from '../common/run.type.ts';

/**
 * Where a script comes from, for Run and Copy alike: it has a body (bun runs a same-named file for an empty one, and
 * umbrella and aggregate rows keep a `null` command), and its package dir is inside `root`.
 */
export const isScriptSourceSafe = (task: TaskNode, root: string, packageDir: string): boolean => {
  const hasBody = task.command !== null;
  const isInRoot = isWithin(root, packageDir);

  return hasBody && isInRoot;
};

/**
 * Spec 1c-b §4.3: why `request` must not run, as the text to show, or `null`. A turbo task is never refused. A script is
 * refused for a name that needs quoting (the allowlist is what makes plain launch args safe), for an empty body or a
 * package dir outside the root, and for Run Without Cache.
 */
export const refusalOf = (request: RunRequest): string | null => {
  const { task } = request;

  if (task.isTurboTask) return null;

  const isSafeName = isSafeScriptName(task.name);
  const isSafeSource = isScriptSourceSafe(task, request.root, request.packageDir);
  const isSafe = isSafeName && isSafeSource;

  if (!isSafe) return unsafeScriptText(task.name);

  if (request.force) return NOT_TURBO_FORCE_TEXT;

  return null;
};
