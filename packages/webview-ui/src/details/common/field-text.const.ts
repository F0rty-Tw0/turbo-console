import type { CacheStatus } from '../../bridge/common/details-state.type.ts';

/** Spec 1b §4.1 field texts, verbatim. */
export const NONE_TEXT = 'none';

export const DEFAULT_INPUTS_TEXT = 'default (all files in the package)';

export const LOADING_TEXT = 'loading…';

export const UNAVAILABLE_TEXT = '—';

export const NO_COMMAND_TEXT = 'No command (runs its dependencies)';

export const NOT_TURBO_TASK_TEXT = 'Not a turbo task: no turbo.json defines it';

export const MISSING_PACKAGE_TEXT = 'Package no longer in the workspace';

/** Spec 1c-a §4.5, §4.7 and §4.10 texts, verbatim. */
export const NO_TASK_CARDS_TEXT = 'No tasks in this package.';

export const RUNS_UNTIL_STOPPED_TEXT = 'runs until stopped';

export const CACHE_TEXTS: Readonly<Record<CacheStatus, string>> = {
  HIT: 'cached: will replay',
  MISS: 'not cached: will run',
  deferred: 'unknown: decided at run time'
};
