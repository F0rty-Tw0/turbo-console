import { assertOnlyMessage, revealLoads } from '../utils/message-tree.spec.util.ts';
import { markDone, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/** L4: a `target-like` copy with no `node_modules` and `turboPath` unset, so the root finds no turbo. */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const api = await turboApi();
  const root = rootAt(0);

  await step('reveal the view', async () => revealLoads(api, [root]));
  await step('6a: the not-found row alone', async () => assertOnlyMessage(api, undefined, 'binary-not-found'));
  await markDone(env);
};
