import { TURBO_LOG_FILE_KEY } from '../../common/run.const.ts';
import type { RunEnv } from '../../common/run.type.ts';
import { FAKE_RUN_ID } from '../common/run-log-id.const.ts';

/** The env turbo gets for a run launched at `launchedAt`, with the fake random id. */
export const logEnvOf = (launchedAt: number): RunEnv => {
  const env: RunEnv = { [TURBO_LOG_FILE_KEY]: `.turbo/turbo-console/run-${launchedAt}-${FAKE_RUN_ID}.json` };

  return env;
};
