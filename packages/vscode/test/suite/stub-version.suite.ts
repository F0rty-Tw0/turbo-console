import { assertOnlyMessage, revealLoads } from '../utils/message-tree.spec.util.ts';
import { markDone, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/** L5 (POSIX only): a `target-like` copy whose `turboPath` is a script that reports turbo 2.12.0. */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const api = await turboApi();
  const root = rootAt(0);

  await step('reveal the view', async () => revealLoads(api, [root]));
  await step('6b: the unsupported-version row alone', async () => assertOnlyMessage(api, undefined, 'binary-version'));
  await markDone(env);
};
