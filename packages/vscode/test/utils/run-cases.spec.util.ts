import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { buildPair } from './build-pair.spec.util.ts';
import { overlapCase } from './overlap-case.spec.util.ts';
import { packageDirOf, setScript, writeEdited } from './package-edit.spec.util.ts';
import { assertOneTerminal, assertTerminalKept } from './run-terminal.spec.util.ts';
import { endedRun, logRunStarts, processStartOf, startRun, startRunWith, summaryNames, taskNodeNamed } from './run-wait.spec.util.ts';
import { scriptTerminals } from './scripts-shell.spec.util.ts';
import { budget, log, step, waitFor } from './suite-env.spec.util.ts';
import { awaitTerminals } from './tree-polish-live.spec.util.ts';
import { descriptionOf } from './tree-polish-tree.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode, TreeRefresh } from '../../src/tree/common/tree-node.type.ts';
import type { ShownManifest, ShownTask, SuiteEnv } from '../common/launch.type.ts';

const BUILD_TASK = 'build';

const FAIL_SCRIPT = 'node -e "process.exit(1)"';

/** Writes `ask-ready` once it waits on stdin, then the line it reads to `ask-got`; exits 3 by itself after 60 s unanswered. */
const ASK_LINES = [
  "const fs = require('node:fs');",
  'setTimeout(() => process.exit(3), 60000).unref();',
  "const rl = require('node:readline').createInterface({ input: process.stdin, output: process.stdout });",
  "fs.writeFileSync('ask-ready', '');",
  "rl.question('name? ', (a) => { fs.writeFileSync('ask-got', a); process.exit(0); });"
];

const ASK_SCRIPT = ASK_LINES.join('\n');

const ASK_FILES = ['ask.js', 'ask-ready', 'ask-got'];

const PASSED_DESCRIPTION = /^\d+\.\ds( · cached)?$/u;

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

/** Runs `node` from the tree and waits for its end, recording the tree events the run fired. */
const runWatched = async (api: TurboConsoleApi, node: TreeNode, fired: TreeRefresh[]): Promise<RunEntry> => {
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
    const fired: TreeRefresh[] = [];

    clickedAt = Date.now();

    const entry = await runWatched(api, node, fired);
    const description = descriptionOf(api, node);

    launchedAt = entry.launchedAt;
    log(`passed run: ${entry.state}, "${description}", ${fired.length} tree events`);
    assert.equal(entry.state, 'passed');
    assert.match(description, PASSED_DESCRIPTION);
    assert.ok(fired.includes(node), 'the run redrew its cached task node');
    await assertTerminalKept(task.fullName);
  });
  // The first run in a window waits for VS Code to create its terminal (0.3–2 s on CI, outside the extension), so the
  // budget gates a second run on the reused terminal and the first run's start is only logged.
  await step('9-run: click to process start on a reused terminal', async () => {
    const firstStart = processStartOf(api, task.fullName, launchedAt);
    const node = await taskNodeNamed(api, task.packageName, task.fullName);
    const warmClickedAt = Date.now();
    const warmLaunchedAt = await startRun(api, node);

    await endedRun(api, node, warmLaunchedAt);

    const warmStart = processStartOf(api, task.fullName, warmLaunchedAt);

    log(`run start, first run (terminal created): ${firstStart - clickedAt} ms`);
    budget('run start', warmStart - warmClickedAt, RUN_START_BUDGET_MS, scene.env);
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

/** UB4 §6: Run Without Turbo on X with a build script that reads a line; the terminal's answer reaches it and turbo writes no summary. */
const directCase = async (scene: RunScene): Promise<void> => {
  const { api, task } = scene;
  const dir = dirname(scene.manifest);

  await step('UB4: Run Without Turbo hands terminal input to a build script that prompts', async () => {
    await writeFile(join(dir, 'ask.js'), ASK_SCRIPT);
    await writeEdited(scene.manifest, scene.manifestText, (manifest) => {
      setScript(manifest, BUILD_TASK, 'node ask.js');
    });
    await whenQuiet(api, scene.root);

    const node = await taskNodeNamed(api, task.packageName, task.fullName);
    const before = await summaryNames(scene.root);
    const launchedAt = await startRunWith(api, node, 'turboConsole.runTaskWithoutTurbo');

    await waitFor('ask-ready', () => existsSync(join(dir, 'ask-ready')));

    // X's pass and fail runs already opened its dedicated terminal; the direct run reuses it (assertOneTerminal below).
    const [terminal] = await awaitTerminals(node.key, () => scriptTerminals(node.key), []);

    assert.ok(terminal, 'no terminal for run without turbo');
    terminal.sendText('bob');

    const entry = await endedRun(api, node, launchedAt);
    const got = await readFile(join(dir, 'ask-got'), 'utf8');
    const after = await summaryNames(scene.root);

    log(`run without turbo: ${entry.state}, got "${got}", ${after.length - before.length} new summaries`);
    assert.equal(entry.state, 'passed');
    assert.equal(got, 'bob');
    assert.deepEqual(after, before);
  });
};

/**
 * Spec §5.3 cases 2, 9-run and 3 and the UB4 Run Without Turbo case, on X = a shown `build` task depending on another (Y).
 * Puts X's `package.json` back and removes the prompt script's files before the overlap case, checks X (6 runs) and
 * Y (2 runs) each kept one terminal, and logs every run's start latency.
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
    await directCase(scene);
  } finally {
    const asked = ASK_FILES.map(async (name) => rm(join(dir, name), { force: true }));

    await Promise.all(asked);
    await writeFile(file, manifestText);
    await whenQuiet(api, root);
  }

  await overlapCase(api, root, x, y);
  await step('3: each task kept one terminal across its runs', async () => {
    await assertOneTerminal(x.fullName);
    await assertOneTerminal(y.fullName);
  });
  logRunStarts(api);
};
