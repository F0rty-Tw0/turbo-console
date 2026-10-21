import type { GraphScene } from '../common/graph.type.ts';
import { cacheCase, detailsCase, openCase } from '../utils/graph-cases.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/**
 * L13: the package graph on a `target-like` copy of its own (M4-1 spec §7). The cases run in order and share the window:
 * case 2 closes the graph panel and reopens it, so the Details case, which makes a second editor, stays last.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const manifest = await readManifest(env);
  const api = await turboApi();
  const root = rootAt(0);
  const scene: GraphScene = { api, root, manifest };

  await step('reveal the view', async () => revealTree(api, root));
  await openCase(scene);
  await cacheCase(scene);
  await detailsCase(scene);
  await markDone(env);
};
