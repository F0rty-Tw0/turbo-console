import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { START_TIMEOUT_MS } from '../../src/run/common/run.const.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import { LATE_TURBO_COMMAND, LATE_TURBO_DIR } from '../common/launch.const.ts';
import { buildPair } from '../utils/build-pair.spec.util.ts';
import { endedRun, startRun, taskNodeNamed } from '../utils/run-wait.spec.util.ts';
import { log, markDone, revealTree, rootAt, sleep, step, turboApi, waitFor } from '../utils/suite-env.spec.util.ts';
import { readManifest, readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/** How long VS Code waits on the `${command:…}` segment before it runs the task, past the extension's start timeout. */
const ANSWER_AFTER_MS = START_TIMEOUT_MS + 2000;

/** When the run is checked: the start timeout has passed, the command has not answered yet. */
const CHECK_AFTER_MS = START_TIMEOUT_MS + 500;

const answerLate = async (): Promise<string> => {
  await sleep(ANSWER_AFTER_MS);

  return LATE_TURBO_DIR;
};

/**
 * L7 (POSIX only): a `target-like` copy whose `turboPath` holds a `${command:…}` segment the suite answers 12 s after VS
 * Code asks, so VS Code makes the task active only after the start timeout. The run must stay running, record the late
 * process start and end normally; it never ends as failed to start, which is what tells the user turbo could not start.
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const manifest = await readManifest(env);
  const api = await turboApi();
  const root = rootAt(0);
  const [task] = buildPair(manifest);
  const command = vscode.commands.registerCommand(LATE_TURBO_COMMAND, answerLate);
  const states: string[] = [];
  const listening = api.runs.onDidChange((entry) => {
    states.push(entry.state);
  });

  try {
    await step('reveal the view', async () => revealTree(api, root));
    await step('C20: a task VS Code starts after the start timeout stays tracked to its end', async () => {
      const node = await taskNodeNamed(api, task.packageName, task.fullName);
      const launchedAt = await startRun(api, node);
      const current = (): RunEntry | undefined => api.runs.get(node.root, node.key);

      await sleep(CHECK_AFTER_MS);

      const waiting = current();
      const waitingRun = [waiting?.state, waiting?.processStartedAt];

      assert.deepEqual(waitingRun, ['running', null]);

      await waitFor('late process start', () => current()?.processStartedAt !== null);

      const ended = await endedRun(api, node, launchedAt);
      const startedAt = ended.processStartedAt ?? Number.NaN;
      const startDelay = startedAt - launchedAt;

      log(`late run: ${ended.state}, process started ${startDelay} ms after the click`);
      assert.equal(ended.state, 'passed');
      assert.ok(startDelay >= START_TIMEOUT_MS, `process started ${startDelay} ms after the click`);
      assert.ok(!states.includes('failed-to-start'), `states: ${states.join(', ')}`);
    });
    await markDone(env);
  } finally {
    listening();
    command.dispose();
  }
};
