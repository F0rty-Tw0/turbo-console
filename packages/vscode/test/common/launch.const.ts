import type { Launch } from './launch.type.ts';

export const EXTENSION_ID = 'turbo-console-dev.turbo-console';

export const SUITE_ENV_KEY = 'TURBO_CONSOLE_IT';

/** Keyed files are backdated by this much before each launch (spec §5.3), so no load sees a file written during its spawn. */
export const BACKDATE_MS = 10_000;

/**
 * The command L7's suite registers and the `${command:…}` segment of its `turboPath` names; it answers with
 * `LATE_TURBO_DIR`, so VS Code runs the dev turbo binary only once the command answers.
 */
export const LATE_TURBO_COMMAND = 'turboConsoleIt.lateTurboDir';

export const LATE_TURBO_DIR = 'now';

/** On CI a launch that misses a timing budget runs at most this many times in all; locally it runs once. */
export const MAX_TIMING_ATTEMPTS = 3;

const NO_ENV: Readonly<Record<string, string>> = {};

const NO_SETTINGS: Readonly<Record<string, string>> = {};

/** L11 opens with theme icons already set, so the setting is read at activation, not only on a change. */
const THEME_ICONS: Readonly<Record<string, string>> = { 'turboConsole.icons': 'theme' };

const SCM_BASE_KEY = 'TURBO_SCM_BASE';

const SCM_HEAD_KEY = 'TURBO_SCM_HEAD';

/** Pins turbo's affected range to the last commit, as the core contract's `AFFECTED_RANGE` does; case 8 makes that commit. */
const PINNED_RANGE: Readonly<Record<string, string>> = { [SCM_BASE_KEY]: 'HEAD~1', [SCM_HEAD_KEY]: 'HEAD' };

const L1: Launch = {
  name: 'L1',
  suite: 'fixture.suite',
  workspace: 'fixture-l1',
  turboPath: 'dev',
  userData: 'U1',
  posixOnly: false,
  env: PINNED_RANGE,
  settings: NO_SETTINGS
};

const L2: Launch = { ...L1, name: 'L2', suite: 'warm.suite' };

const L3: Launch = {
  name: 'L3',
  suite: 'no-root.suite',
  workspace: 'empty-folder',
  turboPath: 'unset',
  userData: 'own',
  posixOnly: false,
  env: NO_ENV,
  settings: NO_SETTINGS
};

const L4: Launch = { ...L3, name: 'L4', suite: 'no-binary.suite', workspace: 'fixture' };

const L5: Launch = { ...L4, name: 'L5', suite: 'stub-version.suite', turboPath: 'stub', posixOnly: true };

const L6: Launch = { ...L3, name: 'L6', suite: 'error-roots.suite', workspace: 'error-roots', turboPath: 'dev' };

const L7: Launch = { ...L5, name: 'L7', suite: 'late-start.suite', turboPath: 'late' };

const L8: Launch = { ...L1, name: 'L8', suite: 'details.suite', workspace: 'two-roots', userData: 'own', env: NO_ENV };

const L9: Launch = { ...L1, name: 'L9', suite: 'tree-polish.suite', workspace: 'fixture', userData: 'own', env: NO_ENV };

const L10: Launch = { ...L1, name: 'L10', suite: 'scripts.suite', workspace: 'fixture', userData: 'own', env: NO_ENV };

const L11: Launch = {
  ...L3,
  name: 'L11',
  suite: 'single-package.suite',
  workspace: 'single-package',
  turboPath: 'dev',
  settings: THEME_ICONS
};

const L12: Launch = { ...L11, name: 'L12', suite: 'empty-workspace.suite', workspace: 'empty-workspace', settings: NO_SETTINGS };

/**
 * Spec §5.3 launches, in run order. L2 reopens L1's workspace with L1's user-data dir; L3 to L12 each get a user-data dir
 * of their own.
 */
export const LAUNCHES: Launch[] = [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12];
