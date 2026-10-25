import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import type { Timings, TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { BACKDATE_MS } from '../common/launch.const.ts';
import type { ColdTree, SpawnCounter, SuiteEnv } from '../common/launch.type.ts';
import { backdateTree } from '../utils/backdate.spec.util.ts';
import { cpuProbeSamples } from '../utils/cpu-probe.spec.util.ts';
import { iconsCase } from '../utils/icons-case.spec.util.ts';
import { packageLifecycleCase } from '../utils/package-lifecycle.spec.util.ts';
import { parityCase } from '../utils/parity-case.spec.util.ts';
import { runCases } from '../utils/run-cases.spec.util.ts';
import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import {
  budget,
  loadsOf,
  log,
  markDone,
  rangeOf,
  revealTree,
  rootAt,
  spanMs,
  step,
  turboApi,
  waitFor
} from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';
import { medianOf } from '../utils/timing.spec.util.ts';
import { busiestPackage, packageNodeNamed, treeRowsOf, walkTree } from '../utils/tree-walk.spec.util.ts';
import { watchCases } from '../utils/watch-cases.spec.util.ts';
import { whenQuiet } from '../utils/watch-wait.spec.util.ts';

const ACTIVATION_BUDGET_MS = 50;

const TREE_VISIBLE_SLACK_MS = 200;

/**
 * The median `cpuProbeSamples` timing on the reference machine at rest (L1 at load average 2 logged 5.1–6.0 ms): a
 * probe this fast leaves the slack unscaled.
 */
const PROBE_REFERENCE_MS = 6;

const EXPAND_BUDGET_MS = 50;

/**
 * Spec §5.3 case 9 cold: reveals the view between two runs of the cpu probe and measures the tree-visible span less the
 * time this thread sat idle inside it while turbo processes ran (the override's `--version` call and the query; see
 * `countTurboSpawns`). That idle time is the wait on turbo's own work, so it is logged, not budgeted; case 7-cold counts
 * the query spawns. The rest is this extension's own work, time it kept this thread busy while turbo ran included, and
 * its slack is `TREE_VISIBLE_SLACK_MS` scaled by how much slower than `PROBE_REFERENCE_MS` the probe ran, so a loaded
 * machine widens it as much as it slows the same thread. The span must not be open before the first probe, or the probe
 * would run inside it.
 */
const revealCold = async (api: TurboConsoleApi, root: string, counter: SpawnCounter): Promise<ColdTree> => {
  const isOpened = api.timings.treeVisible.has(root);

  assert.equal(isOpened, false, 'the tree-visible span opened before the cpu probe ran');

  const before = cpuProbeSamples();

  await revealTree(api, root);

  const after = cpuProbeSamples();
  const probes = [...before, ...after];
  const probe = medianOf(probes);
  const slowdown = Math.max(1, probe / PROBE_REFERENCE_MS);
  const probeText = probes.map((ms) => ms.toFixed(1)).join(' ');
  const span = rangeOf('tree visible', api.timings.treeVisible.get(root));
  const visible = span.end - span.start;
  const turbo = counter.turboMs(span);
  const cold: ColdTree = { ownMs: visible - turbo, slackMs: TREE_VISIBLE_SLACK_MS * slowdown };

  log(`timing cpu probe: median ${probe.toFixed(1)} ms of ${probeText}, slack scaled ${slowdown.toFixed(2)}x`);
  log(`timing tree visible cold: ${visible.toFixed(1)} ms, turbo wait ${turbo.toFixed(1)} ms of it (not budgeted)`);

  return cold;
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
 * The activation budget: budgets this extension's own work, the span before the roots' stat calls are answered
 * plus the span after, and logs the wait between them unbudgeted (with the wait counted, CI runners logged 10–470 ms for identical code).
 */
const activationBudget = (timings: Timings, env: SuiteEnv): void => {
  const before = spanMs('activation', timings.activation);
  const after = spanMs('activation resume', timings.activationResume);
  const beforeEnd = timings.activation.end ?? Number.NaN;
  const wait = timings.activationResume.start - beforeEnd;

  log(`timing activation: ${before.toFixed(1)} ms + ${after.toFixed(1)} ms, stat wait ${wait.toFixed(1)} ms (not budgeted)`);
  assert.ok(wait >= 0, `activation resumed ${-wait} ms before its first part ended`);
  budget('activation', before + after, ACTIVATION_BUDGET_MS, env);
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
  let cold: ColdTree = { ownMs: Number.NaN, slackMs: Number.NaN };
  let expand = Number.NaN;

  try {
    await step('7-activation: no load before the view opens', () => {
      assert.deepEqual(loadsOf(api, root), []);
    });
    await step('reveal the view', async () => {
      cold = await revealCold(api, root, counter);
    });
    await step('7-cold: one turbo spawn', () => {
      assert.equal(counter.count(), 1);
    });
    await step('9: time an expand before any walk', async () => {
      const name = busiestPackage(manifest);

      expand = await expandMs(api, name);
    });
    await step('1: the tree lists every package and visible task', async () => {
      const expected = treeRowsOf(manifest);
      const expectedTasks = Object.values(expected.tasks);
      const hasRows = expected.packages.length > 0 && expectedTasks.length > 0;
      const walked = await walkTree(api);
      const walkedTasks = Object.values(walked.tasks).flat();

      assert.ok(hasRows, 'the manifest lists no packages or no tasks');
      log(`tree: ${walked.packages.length} packages, ${walkedTasks.length} tasks, ${walked.messages.length} messages`);
      assert.deepEqual(walked, expected);
    });
    await step('9: cold timings', () => {
      budget('tree visible cold, own work', cold.ownMs, cold.slackMs, env);
      budget('expand', expand, EXPAND_BUDGET_MS, env);
      activationBudget(api.timings, env);
    });
    await watchCases(api, root, counter, manifest);
    await packageLifecycleCase(api, root);
    await runCases(api, root, manifest, env);
    await parityCase(api, root, manifest, env);
    // later spec §5.3 cases go here, after case 9 and before the warm-up
    await iconsCase(api, root, manifest);
    await step('warm-up', async () => warmUp(api, root));
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
