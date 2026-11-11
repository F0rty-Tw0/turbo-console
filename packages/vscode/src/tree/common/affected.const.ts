import type { AffectedMark, AffectedMode } from './affected.type.ts';

export const AFFECTED_WORDS: Readonly<Record<AffectedMark, string>> = {
  changed: 'affected',
  dependency: 'affected via dependency'
};

export const AFFECTED_LEVELS: Readonly<Record<AffectedMode, string>> = {
  task: 'task level',
  package: 'package level'
};

/** The turbo reasons that name a changed file. */
export const AFFECTED_FILE_REASONS: ReadonlySet<string> = new Set([
  'TaskFileChanged',
  'TaskGlobalFileChanged',
  'TaskGlobalDepsChanged'
]);

/** The turbo reasons that name another task or package as the cause. */
export const AFFECTED_DEPENDENCY_REASONS: ReadonlySet<string> = new Set(['TaskDependencyTaskChanged', 'TaskPackageDependencyChanged']);

/** Turbo's own `detail` text of a `TaskAllChanged` row for an upstream task that runs only because a dependent is affected. */
export const AFFECTED_REQUIRED_DETAIL = 'required by an affected task';
