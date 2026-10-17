import type { PackageManager } from '@turbo-console/core';

import { sourceText } from './source-text.util.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { toastText } from '../../shared/utils/link-safe.util.ts';
import { START_TIMEOUT_MS } from '../common/run.const.ts';

const SECONDS = START_TIMEOUT_MS / 1000;

/** The notice text of a run whose process never started; `processName` is `turbo`, or the package manager of a script. */
export const failedToStartText = (processName: string): string => `Couldn't start ${processName}.`;

export const startTimeoutText = (processName: string): string => `${processName} process did not start within ${SECONDS} s`;

export const startWaitText = (processName: string): string =>
  `${processName} process has not started after ${SECONDS} s; VS Code may be waiting on a save prompt or an input`;

/**
 * The backticks are literal: they keep a name with spaces delimited. A toast still turns link syntax into a clickable
 * link, so the name goes through `toastText`.
 */
export const unsafeScriptText = (name: string): string => {
  const shown = toastText(name, LABEL_MAX);

  return `Turbo Console can't run a script named \`${shown}\` safely.`;
};

/** The hedged Output line of a script that ended 127 or 9009: the missing command may be one the script itself runs. */
export const notFoundText = (packageManager: PackageManager, exitCode: number): string => {
  const runner = `${packageManager.name} ${sourceText(packageManager.source)}`;

  return `exit ${exitCode}: a command was not found: ${runner} or one the script runs. Install it or check packageManager.`;
};
