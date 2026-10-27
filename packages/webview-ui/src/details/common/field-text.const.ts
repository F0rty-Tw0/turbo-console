import type { CacheStatus } from '../../bridge/common/details-state.type.ts';

/** Spec 1b §4.1 field texts, verbatim. */
export const NONE_TEXT = 'none';

export const DEFAULT_INPUTS_TEXT = 'default (all files in the package)';

export const LOADING_TEXT = 'loading…';

export const UNAVAILABLE_TEXT = '—';

export const NO_COMMAND_TEXT = 'No command (runs its dependencies)';

export const MISSING_PACKAGE_TEXT = 'Package no longer in the workspace';

export const FOCUS_IN_GRAPH_LABEL = 'Focus on graph';

/** Spec 1c-a §4.5, §4.7 and §4.10 texts, verbatim. */
export const NO_TASK_CARDS_TEXT = 'No tasks in this package.';

/** Polish spec 3 §4.3 item 4: one chip replaces the dry-run "Continuous" badge and the "runs until stopped" note. */
export const CONTINUOUS_CHIP_TEXT = 'Continuous · runs until stopped';

export const NOT_CACHEABLE_CHIP_TEXT = 'Not cacheable';

/** Spec 1c-b §4.10 section titles; the page adds each section's card count. */
export const TURBO_TASKS_TITLE = 'Turbo tasks';

export const SCRIPTS_TITLE = 'Scripts';

export const CACHE_TEXTS: Readonly<Record<CacheStatus, string>> = {
  HIT: 'cached: will replay',
  MISS: 'not cached: will run',
  deferred: 'unknown: decided at run time'
};
