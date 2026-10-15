import type { CacheStatus } from '../../bridge/common/details-state.type.ts';

/** Spec 1b §4.1 field texts, verbatim. */
export const NONE_TEXT = 'none';

export const DEFAULT_INPUTS_TEXT = 'default (all files in the package)';

export const LOADING_TEXT = 'loading…';

export const UNAVAILABLE_TEXT = '—';

export const NO_COMMAND_TEXT = 'No command (runs its dependencies)';

export const MISSING_PACKAGE_TEXT = 'Package no longer in the workspace';

export const CACHE_TEXTS: Readonly<Record<CacheStatus, string>> = {
  HIT: 'hit',
  MISS: 'miss',
  deferred: 'decided at run time'
};
