import type { GraphScene } from '../common/graph.type.ts';
import { atomGroupCase } from '../utils/graph-atom-cases.spec.util.ts';
import { cacheCase, detailsCase, openCase, runRepaintCase, taskGraphCase } from '../utils/graph-cases.spec.util.ts';
import { explainCase, openManifestCase } from '../utils/graph-explain-cases.spec.util.ts';
import { detailsFocusGraphCase, detailsTaskGraphCase, showAllTaskGraphsCase } from '../utils/graph-task-cases.spec.util.ts';
import { markDone, revealTree, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/**
 * L13: the package graph on a `target-like` copy of its own (M4-1 spec §7). The cases run in order and share the window:
 * case 2 closes the graph panel and reopens it, so the explain cases follow the reopen and the Details case, which makes
 * a second editor, is followed only by the task cases, which show and run a task in the same window. The Details
 * task-graph and focus cases come next: they open a Details panel and post to the open graph panel. Show All Task Graphs closes.
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
  await explainCase(scene);
  await openManifestCase(scene);
  await detailsCase(scene);
  await taskGraphCase(scene);
  await runRepaintCase(scene);
  await atomGroupCase(scene);
  await detailsTaskGraphCase(scene);
  await detailsFocusGraphCase(scene);
  await showAllTaskGraphsCase(scene);
  await markDone(env);
};
