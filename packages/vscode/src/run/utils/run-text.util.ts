import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { START_TIMEOUT_MS } from '../common/run.const.ts';

const SECONDS = START_TIMEOUT_MS / 1000;

/** The notice text of a run whose process never started; `processName` is `turbo`, or the package manager of a script. */
export const failedToStartText = (processName: string): string => `Couldn't start ${processName}.`;

export const startTimeoutText = (processName: string): string => `${processName} process did not start within ${SECONDS} s`;

export const startWaitText = (processName: string): string =>
  `${processName} process has not started after ${SECONDS} s; VS Code may be waiting on a save prompt or an input`;

/** The backticks are literal: `showInformationMessage` renders no markdown, and they keep a name with spaces delimited. */
export const unsafeScriptText = (name: string): string =>
  `Turbo Console can't run a script named \`${cleanText(name, LABEL_MAX)}\` safely.`;
