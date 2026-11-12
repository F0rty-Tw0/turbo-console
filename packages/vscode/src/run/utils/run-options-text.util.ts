import type { PackageManagerName } from '@turbo-console/core';

export const argsErrorText = (position: number, arg: string): string =>
  `Argument ${position} ("${arg}") can only use letters, digits and @ / . _ : = + -, and cannot start with = or @`;

export const pickerPlaceholderOf = (taskName: string, packageName: string): string => `Run ${taskName} in ${packageName} with…`;

export const turboArgsPromptOf = (taskName: string): string => `Arguments for every ${taskName} task in the run (after --)`;

export const scriptArgsPromptOf = (manager: PackageManagerName, scriptName: string): string =>
  `Arguments for ${manager} run ${scriptName}`;
