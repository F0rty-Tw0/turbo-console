import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { overlapCase } from './overlap-case.spec.util.ts';
import { packageDirOf, setScript, writeEdited } from './package-edit.spec.util.ts';
import { endedRun, logRunStarts, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { budget, log, step } from './suite-env.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { RunTiming, TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { ShownManifest, ShownTask, SuiteEnv } from '../common/launch.type.ts';

const BUILD_TASK = 'build';

const FAIL_SCRIPT = 'node -e "process.exit(1)"';

const PASSED_DESCRIPTION = /^\d+\.\ds · (HIT|MISS)$/u;

/** Spec §4.5: click to process started. */
const RUN_START_BUDGET_MS = 300;

type RunScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly env: SuiteEnv;
  readonly task: ShownTask;
  readonly manifest: string;
  readonly manifestText: string;
};

const isShownBuild = (task: ShownTask): boolean => task.visible && task.kind === 'task' && task.fullName.endsWith('#build');

const byFullName = (left: ShownTask, right: ShownTask): number =>
  Number(left.fullName > right.fullName) - Number(left.fullName < right.fullName);

/** The first of the dependencies of `task` that is in `builds`. */
const buildDependencyOf = (task: ShownTask, builds: Map<string, ShownTask>): ShownTask | undefined => {
  for (const id of task.dependencies) {
    const dependency = builds.get(id);

    if (dependency !== undefined) return dependency;
  }

  return undefined;
};

/**
 * X and Y of spec §5.3 case 3: X is the first shown `build` task by name that depends on another shown `build` task,
 * Y the first such dependency. Case 2 runs X.
 */
const buildPair = (manifest: ShownManifest): [ShownTask, ShownTask] => {
  const shown = manifest.tasks.filter(isShownBuild);
  const builds = new Map(shown.map((task) => [task.fullName, task]));

  for (const x of shown.toSorted(byFullName)) {
    const y = buildDependencyOf(x, builds);

    if (y !== undefined) return [x, y];
  }

  throw new Error('the manifest has no build task that depends on another');
};

const descriptionOf = (api: TurboConsoleApi, node: TreeNode): string => {
  const { description } = api.tree.getTreeItem(node);

  if (typeof description !== 'string') throw new Error(`${node.key} has no description`);

  return description;
};

const terminalsOf = (taskId: string): string[] => {
  const names = vscode.window.terminals.map((terminal) => terminal.name);

  log(`terminals: ${names.join(', ')}`);

  return names.filter((name) => name.includes(taskId));
};

/** The run's dedicated terminal, named after its task id, is still open after the run ended, its output kept. */
const assertTerminalKept = (taskId: string): void => {
  const terminals = terminalsOf(taskId);

  assert.ok(terminals.length > 0, `no terminal of ${taskId} is open`);
};

/**
 * Spec §4.5 step 3: every run of a task reuses its one dedicated terminal. VS Code keys that reuse on the task's
 * declared definition keys, which is why the launch token stays undeclared.
 */
const assertOneTerminal = (taskId: string): void => {
  const terminals = terminalsOf(taskId);

  assert.equal(terminals.length, 1, `terminals of ${taskId}: ${terminals.join(', ')}`);
};

/** Runs `node` from the tree and waits for its end, recording the tree events the run fired. */
const runWatched = async (api: TurboConsoleApi, node: TreeNode, fired: (TreeNode | undefined)[]): Promise<RunEntry> => {
  const listening = api.tree.onDidChangeTreeData((changed) => {
    fired.push(changed);
  });

  try {
    const launchedAt = await startRun(api, node);

    return await endedRun(api, node, launchedAt);
  } finally {
    listening.dispose();
  }
};

/** Spec §5.3 cases 2 (passing run) and 9-run (click to process start, the click taken before the command runs). */
const passCase = async (scene: RunScene): Promise<void> => {
  const { api, task } = scene;
  let launchedAt = Number.NaN;
  let clickedAt = Number.NaN;

  await step('2: a tree run of build passes with its summary data', async () => {
    const node = await taskNodeNamed(api, task.packageName, task.fullName);
    const fired: (TreeNode | undefined)[] = [];

    clickedAt = Date.now();

    const entry = await runWatched(api, node, fired);
    const description = descriptionOf(api, node);

    launchedAt = entry.launchedAt;
    log(`passed run: ${entry.state}, "${description}", ${fired.length} tree events`);
    assert.equal(entry.state, 'passed');
    assert.match(description, PASSED_DESCRIPTION);
    assert.ok(fired.includes(node), 'the run redrew its cached task node');
    assertTerminalKept(task.fullName);
  });
  await step('9-run: click to process start', () => {
    const isPassedRun = (record: RunTiming): boolean => record.taskId === task.fullName && record.clickedAt === launchedAt;
    const timing = api.timings.runs.find(isPassedRun);
    const started = timing?.processStartedAt ?? null;

    if (timing === undefined || started === null) throw new Error('the passed run recorded no process start');

    budget('run start', started - clickedAt, RUN_START_BUDGET_MS, scene.env);
  });
};

/** Spec §5.3 case 2: the same task with a script that exits 1. */
const failCase = async (scene: RunScene): Promise<void> => {
  const { api, task } = scene;

  await step('2: a build script that exits 1 ends failed with exit 1', async () => {
    await writeEdited(scene.manifest, scene.manifestText, (manifest) => {
      setScript(manifest, BUILD_TASK, FAIL_SCRIPT);
    });
    await whenQuiet(api, scene.root);

    const node = await taskNodeNamed(api, task.packageName, task.fullName);
    const launchedAt = await startRun(api, node);
    const entry = await endedRun(api, node, launchedAt);
    const description = descriptionOf(api, node);

    log(`failed run: ${entry.state}, "${description}"`);
    assert.equal(entry.state, 'failed');
    assert.ok(description.startsWith('exit 1'), `description: ${description}`);
  });
};

/**
 * Spec §5.3 cases 2, 9-run and 3, on X = a shown `build` task depending on another (Y). Puts X's `package.json` back
 * before the overlap case, checks X (4 runs) and Y (2 runs) each kept one terminal, and logs every run's start latency.
 */
export const runCases = async (api: TurboConsoleApi, root: string, manifest: ShownManifest, env: SuiteEnv): Promise<void> => {
  const [x, y] = buildPair(manifest);
  const dir = await packageDirOf(root, x.packageName);
  const file = join(dir, 'package.json');
  const manifestText = await readFile(file, 'utf8');
  const scene: RunScene = { api, root, env, task: x, manifest: file, manifestText };

  try {
    await passCase(scene);
    await failCase(scene);
  } finally {
    await writeFile(file, manifestText);
    await whenQuiet(api, root);
  }

  await overlapCase(api, root, x, y);
  await step('3: each task kept one terminal across its runs', () => {
    assertOneTerminal(x.fullName);
    assertOneTerminal(y.fullName);
  });
  logRunStarts(api);
};
