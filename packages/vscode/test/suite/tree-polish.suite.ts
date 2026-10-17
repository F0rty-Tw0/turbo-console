import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';
import { cachedRunCase, forcedRunCase } from '../utils/tree-polish-cache.spec.util.ts';
import { emptyPackageCase, scopeToggleCase, scriptRowCase } from '../utils/tree-polish-cases.spec.util.ts';
import { prepareFixture } from '../utils/tree-polish-fixture.spec.util.ts';
import { ctrlCCase, killCase, liveRowCase } from '../utils/tree-polish-run.spec.util.ts';
import { spawnCase, tickerCase } from '../utils/tree-polish-ticker.spec.util.ts';

/**
 * L9: spec 1c-a §6.4 on a `target-like` copy of its own. Every fixture edit and its backdating come before the view is
 * revealed, so case 5's second run finds every input unchanged. The cases run in order and share the window: the scope
 * toggle and the tree mode end where they began, and every run ends before the next case starts.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error('L9 needs the dev turbo path');

  const api = await turboApi();
  const root = rootAt(0);
  const counter = countTurboSpawns(turboPath);

  try {
    await step('edit the fixture before the view is revealed', async () => prepareFixture(api, root));
    await step('reveal the view', async () => revealTree(api, root));
    await emptyPackageCase(api, root);
    await scopeToggleCase(api);
    await scriptRowCase(api);
    await liveRowCase(api);
    await ctrlCCase(api);
    await killCase(api);
    await cachedRunCase(api);

    const forced = await forcedRunCase(api, counter);
    const ticking = await tickerCase(api, counter);

    await spawnCase(forced, ticking);
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
