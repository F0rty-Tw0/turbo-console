import type { Launch } from './launch.type.ts';

export const EXTENSION_ID = 'turbo-console-dev.turbo-console';

export const SUITE_ENV_KEY = 'TURBO_CONSOLE_IT';

/** Keyed files are backdated by this much before each launch (spec §5.3), so no load sees a file written during its spawn. */
export const BACKDATE_MS = 10_000;

/** On CI a launch that misses a timing budget runs at most this many times in all; locally it runs once. */
export const MAX_TIMING_ATTEMPTS = 3;

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

/** Spec §5.3 launches, in run order. L2 reopens L1's workspace with L1's user-data dir. */
export const LAUNCHES: Launch[] = [L1, L2];
