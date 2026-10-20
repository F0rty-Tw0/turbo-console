import { assertOnlyMessage, revealLoads } from '../utils/message-tree.spec.util.ts';
import { markDone, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/**
 * L12: spec §2.6 on `empty-ws`, whose `pnpm-workspace.yaml` declares `packages/*` and finds none. Although the root has
 * scripts and a bare `build` key, the only tree row is the `no-packages` message.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const api = await turboApi();
  const root = rootAt(0);

  await step('reveal the view', async () => revealLoads(api, [root]));
  await step('L12: the only row is the no-packages message', async () => assertOnlyMessage(api, undefined, 'no-packages'));
  await markDone(env);
};
