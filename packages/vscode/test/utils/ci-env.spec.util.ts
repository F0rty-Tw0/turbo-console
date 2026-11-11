import assert from 'node:assert/strict';

import { CI_ENV_KEYS } from '../common/launch.const.ts';

/** The CI variables are gone from this host, so turbo's default base is the local one on a GitHub runner too. */
export const assertNoCiEnv = (): void => {
  for (const key of CI_ENV_KEYS) assert.equal(process.env[key], undefined, `${key} is set in the extension host`);
};
