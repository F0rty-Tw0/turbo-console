import type { Launch } from './launch.type.ts';

export const EXTENSION_ID = 'turbo-console-dev.turbo-console';

export const SUITE_ENV_KEY = 'TURBO_CONSOLE_IT';

/** Keyed files are backdated by this much before each launch (spec §5.3), so no load sees a file written during its spawn. */
export const BACKDATE_MS = 10_000;

const NO_ENV: Readonly<Record<string, string>> = {};

const L1: Launch = {
  name: 'L1',
  suite: 'fixture.suite',
  workspace: 'fixture-l1',
  turboPath: 'dev',
  userData: 'U1',
  posixOnly: false,
  env: NO_ENV
};

const L2: Launch = { ...L1, name: 'L2', suite: 'warm.suite' };

const L3: Launch = {
  name: 'L3',
  suite: 'no-root.suite',
  workspace: 'empty-folder',
  turboPath: 'unset',
  userData: 'own',
  posixOnly: false,
  env: NO_ENV
};

const L4: Launch = { ...L3, name: 'L4', suite: 'no-binary.suite', workspace: 'fixture' };

const L5: Launch = { ...L4, name: 'L5', suite: 'stub-version.suite', turboPath: 'stub', posixOnly: true };

const L6: Launch = { ...L3, name: 'L6', suite: 'error-roots.suite', workspace: 'error-roots', turboPath: 'dev' };

/**
 * Spec §5.3 launches, in run order. L2 reopens L1's workspace with L1's user-data dir; L3 to L6 each get a user-data dir
 * of their own.
 */
export const LAUNCHES: Launch[] = [L1, L2, L3, L4, L5, L6];
