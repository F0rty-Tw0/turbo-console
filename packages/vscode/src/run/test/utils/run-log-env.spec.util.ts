import { TURBO_LOG_FILE_KEY } from '../../common/run.const.ts';
import type { RunEnv } from '../../common/run.type.ts';

/** The env turbo gets for a run launched at `launchedAt`, with the fake random id. */
export const logEnvOf = (launchedAt: number): RunEnv => {
  const env: RunEnv = { [TURBO_LOG_FILE_KEY]: `.turbo/turbo-console/run-${launchedAt}-ab12cd34.json` };

  return env;
};
