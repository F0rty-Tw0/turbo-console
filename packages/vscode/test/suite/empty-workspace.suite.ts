import { assertOnlyMessage, revealLoads } from '../utils/message-tree.spec.util.ts';
import { markDone, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/**
 * L12: spec §2.6 on `empty-ws`, whose `pnpm-workspace.yaml` declares `packages/*` and finds none. Its one package is the
 * root `//`, whose scripts are no turbo tasks (a bare `build` key never names a root task), so with scripts hidden the
 * only tree row is the `no-packages` message, which points at the globs rather than Show Scripts.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const api = await turboApi();
  const root = rootAt(0);

  await step('reveal the view', async () => revealLoads(api, [root]));
  await step('L12: the only row is the no-packages message', async () => assertOnlyMessage(api, undefined, 'no-packages'));
  await markDone(env);
};
