import type { PackageManagerName } from '@turbo-console/core';

/** Same cap as core's `ECHO_LIMIT` (packages/core/src/run-args/utils/run-extras.util.ts), which core does not export. */
const ECHO_LIMIT = 200;

export const argsErrorText = (position: number, arg: string): string => {
  const echoed = arg.slice(0, ECHO_LIMIT);

  return `Argument ${position} ("${echoed}") can only use letters, digits and @ / . _ : = + -, and cannot start with = or @`;
};

export const pickerPlaceholderOf = (taskName: string, packageName: string): string => `Run ${taskName} in ${packageName} with…`;

export const turboArgsPromptOf = (taskName: string): string => `Arguments for every ${taskName} task in the run (after --)`;

export const scriptArgsPromptOf = (manager: PackageManagerName, scriptName: string): string =>
  `Arguments for ${manager} run ${scriptName}`;
