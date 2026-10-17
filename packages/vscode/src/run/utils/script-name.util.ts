import { assertTaskName } from '@turbo-console/core';
import type { PackageManagerName } from '@turbo-console/core';

import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { BARE, BARE_FIRST_BLOCKED, SCRIPT_NAME_FIRST_BLOCKED } from '../common/shell.const.ts';

const isTaskName = (name: string): boolean => {
  try {
    assertTaskName(name);
  } catch {
    return false;
  }

  return true;
};

/**
 * A script name that needs no quoting in any shell: `assertTaskName` passes (no leading `-`, which a package manager
 * would read as a flag), every character is a bare word character, the first is not `=`, `@`, `/` or `.` (pnpm reads
 * `/regex/` as a selector and refuses a hidden `.` script), and it is at most `LABEL_MAX` long, so a runnable name is never shown truncated. ASCII
 * only; widening the set later is additive.
 */
export const isSafeScriptName = (name: string): boolean => {
  const isShort = name.length <= LABEL_MAX;

  if (!isShort) return false;

  const isBare = BARE.test(name);
  const startsBlocked = BARE_FIRST_BLOCKED.test(name) || SCRIPT_NAME_FIRST_BLOCKED.test(name);

  return isBare && !startsBlocked && isTaskName(name);
};

/** The command a user would type to run script `name`; `null` for a refused name. */
export const scriptCommandOf = (manager: PackageManagerName, name: string): string | null => {
  const isSafe = isSafeScriptName(name);

  if (!isSafe) return null;

  return `${manager} run ${name}`;
};
