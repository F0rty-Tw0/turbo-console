import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadWorkspace, resolveTurbo } from '@turbo-console/core';
import * as vscode from 'vscode';

import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { BACKDATE_MS } from '../common/launch.const.ts';
import { backdateTree } from '../utils/backdate.spec.util.ts';
import { packageLifecycleCase } from '../utils/package-lifecycle.spec.util.ts';
import { runCases } from '../utils/run-cases.spec.util.ts';
import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { budget, loadsOf, log, markDone, revealTree, rootAt, spanMs, step, turboApi, waitFor } from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';
import { busiestPackage, manifestTree, packageNodeNamed, walkTree } from '../utils/tree-walk.spec.util.ts';
import { watchCases } from '../utils/watch-cases.spec.util.ts';
import { whenQuiet } from '../utils/watch-wait.spec.util.ts';

const ACTIVATION_BUDGET_MS = 50;

const TREE_VISIBLE_SLACK_MS = 200;

const EXPAND_BUDGET_MS = 50;

/** Spec §5.3 case 9: the suite's own timing of one `loadWorkspace` call, with a cache dir of its own. */
const queryMs = async (root: string, turboPath: string): Promise<number> => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'tc-it-query-'));
  const options = { trusted: true, overridePath: turboPath } as const;

  try {
    const binary = await resolveTurbo(root, options);
    const start = performance.now();

    await loadWorkspace(binary, { cacheDir });

    return performance.now() - start;
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
};

/** Spec §5.3 case 9 expand: `getChildren` on a package plus `getTreeItem` for each child, as VS Code does on expand. */
const expandMs = async (api: TurboConsoleApi, name: string): Promise<number> => {
  const node = await packageNodeNamed(api, name);
  const start = performance.now();
  const children = await api.tree.getChildren(node);

  for (const child of children) api.tree.getTreeItem(child);

  return performance.now() - start;
};

/**
 * Spec §5.3 warm-up: backdate every keyed file, let any load settle, then refresh so the last load stores a valid key
 * for the final file state, and leave the Explorer showing so L2 does not restore this container on startup.
 */
const warmUp = async (api: TurboConsoleApi, root: string): Promise<void> => {
  const records = loadsOf(api, root);

  await backdateTree(root, BACKDATE_MS);
  await whenQuiet(api, root);

  const before = records.length;

  await vscode.commands.executeCommand('turboConsole.refresh');
  await waitFor('refresh load', () => records.length > before);
  await api.whenIdle(root);

  const last = records.at(-1);
  const lastLoad = [last?.mode, last?.outcome];

  assert.deepEqual(lastLoad, ['full', 'model']);
  await vscode.commands.executeCommand('workbench.view.explorer');
};

/** L1: the `target-like` fixture with a fresh user-data dir. */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const manifest = await readManifest(env);
  const turboPath = env.turboPath;

  if (turboPath === null) throw new Error('L1 needs the dev turbo path');

  const api = await turboApi();
  const root = rootAt(0);
  const counter = countTurboSpawns(turboPath);
  let expand = Number.NaN;

  try {
    await step('7-activation: no load before the view opens', () => {
      assert.deepEqual(loadsOf(api, root), []);
    });
    await step('reveal the view', async () => revealTree(api, root));
    await step('7-cold: one turbo spawn', () => {
      assert.equal(counter.count(), 1);
    });
    await step('9: time an expand before any walk', async () => {
      const name = busiestPackage(manifest);

      expand = await expandMs(api, name);
    });
    await step('1: the tree lists every package and visible task', async () => {
      const expected = manifestTree(manifest);
      const expectedTasks = Object.values(expected.tasks);
      const hasRows = expected.packages.length > 0 && expectedTasks.length > 0;
      const walked = await walkTree(api);
      const walkedTasks = Object.values(walked.tasks).flat();

      assert.ok(hasRows, 'the manifest lists no packages or no tasks');
      log(`tree: ${walked.packages.length} packages, ${walkedTasks.length} tasks, ${walked.messages.length} messages`);
      assert.deepEqual(walked, expected);
    });
    await step('9: cold timings', async () => {
      const activation = spanMs('activation', api.timings.activation);
      const visible = spanMs('tree visible', api.timings.treeVisible.get(root));
      const query = await queryMs(root, turboPath);

      log(`timing query: ${query.toFixed(1)} ms`);
      budget('tree visible cold', visible, query + TREE_VISIBLE_SLACK_MS, env);
      budget('expand', expand, EXPAND_BUDGET_MS, env);
      budget('activation', activation, ACTIVATION_BUDGET_MS, env);
    });
    await watchCases(api, root, counter, manifest);
    await packageLifecycleCase(api, root);
    await runCases(api, root, manifest, env);
    // later spec §5.3 cases go here, after case 9 and before the warm-up
    await step('warm-up', async () => warmUp(api, root));
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
