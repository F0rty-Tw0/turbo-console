import { detailsCase, lensCase } from '../utils/single-package-details.spec.util.ts';
import { flagCase } from '../utils/single-package-flag.spec.util.ts';
import { taskGraphCase } from '../utils/single-package-graph.spec.util.ts';
import { runCase } from '../utils/single-package-run.spec.util.ts';
import { rowAndTasksCase, scriptsCase, themeIconCase } from '../utils/single-package-tree.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/**
 * L11: spec §2 on `single-app`, a single-package repo (root `turbo.json`, no workspaces). The cases run in order and
 * share the window: the run (case 2) ends quiet before the panel and the lens read the root.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const api = await turboApi();
  const root = rootAt(0);

  await step('reveal the view', async () => revealTree(api, root));
  await rowAndTasksCase(api);
  await scriptsCase(api);
  await runCase(api, root);
  await detailsCase(api, root);
  await lensCase(root);
  await taskGraphCase(api, root);
  await flagCase(api, root, env.budgetFactor);
  await themeIconCase(api, root);
  await markDone(env);
};
