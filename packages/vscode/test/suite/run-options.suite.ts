import { emptyPickCase, scriptArgsCase, turboOptionsCase } from '../utils/run-options-cases.spec.util.ts';
import { prepareOptionsFixture } from '../utils/run-options-fixture.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/**
 * L19: Run with Options (M3-3 spec §11 I1-I3) on a `target-like` copy of its own. Cases run in order and share the window;
 * every run ends before the next case starts.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const api = await turboApi();
  const root = rootAt(0);

  await step('edit the fixture before the view is revealed', async () => prepareOptionsFixture(api, root));
  await step('reveal the view', async () => revealTree(api, root));
  const plainArgs = await emptyPickCase(api);

  await turboOptionsCase(api, plainArgs);
  await scriptArgsCase(api);
  await markDone(env);
};
