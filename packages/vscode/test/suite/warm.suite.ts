import assert from 'node:assert/strict';

import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { budget, loadsOf, markDone, revealTree, rootAt, spanMs, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

const TREE_VISIBLE_WARM_BUDGET_MS = 300;

/** L2: L1's fixture copy and user-data dir again, so the root's cache from L1's warm-up answers the first load. */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error('L2 needs the dev turbo path');

  const api = await turboApi();
  const root = rootAt(0);
  const counter = countTurboSpawns(turboPath);

  try {
    await step('7-activation: no load before the view opens', () => {
      assert.deepEqual(loadsOf(api, root), []);
    });
    await step('reveal the view', async () => revealTree(api, root));
    await step('7-warm: no turbo spawn', () => {
      assert.equal(counter.count(), 0);
    });
    await step('7-warm: one fresh cache-first load, no full load', () => {
      const records = loadsOf(api, root);
      const loads = records.map((record) => [record.mode, record.cacheFresh]);

      assert.deepEqual(loads, [['cache-first', true]]);
    });
    await step('9: warm timings', () => {
      const visible = spanMs('tree visible', api.timings.treeVisible.get(root));

      budget('tree visible warm', visible, TREE_VISIBLE_WARM_BUDGET_MS, env);
    });
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
