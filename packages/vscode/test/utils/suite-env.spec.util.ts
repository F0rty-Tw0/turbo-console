import { appendFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

import * as vscode from 'vscode';

import type { LoadRecord } from '../../src/roots/common/coordinator.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { Span } from '../../src/shared/common/span.type.ts';
import { EXTENSION_ID } from '../common/launch.const.ts';
import type { SuiteEnv } from '../common/launch.type.ts';

const POLL_MS = 10;

const WAIT_LIMIT_MS = 30_000;

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

/** The extension host's output reaches the test runner's stdout. */
export const log = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

export const turboApi = async (): Promise<TurboConsoleApi> => {
  const extension = vscode.extensions.getExtension<TurboConsoleApi>(EXTENSION_ID);

  if (extension === undefined) throw new Error(`${EXTENSION_ID} is not installed`);

  return extension.activate();
};

/** The root key of workspace folder `index`, exactly as the extension keys it; the only source of root keys in a suite. */
export const rootAt = (index: number): string => {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const folder = folders.at(index);

  if (folder === undefined) throw new Error(`no workspace folder ${index}; ${folders.length} open`);

  return folder.uri.fsPath;
};

/** A root's load records; a missing key throws, so a key mismatch never passes a "no loads" check. */
export const loadsOf = (api: TurboConsoleApi, root: string): LoadRecord[] => {
  const records = api.loads.get(root);

  if (records === undefined) {
    const known = Array.from(api.loads.keys()).join(', ');

    throw new Error(`unknown root ${root}; known: ${known}`);
  }

  return records;
};

export const spanMs = (name: string, span: Span | undefined): number => {
  if (span?.end === undefined || span.end === null) throw new Error(`${name}: span not closed`);

  return span.end - span.start;
};

/** Polls `isDone` until it holds; throws with `name` after 30 s. */
export const waitFor = async (name: string, isDone: () => boolean): Promise<void> => {
  const deadline = performance.now() + WAIT_LIMIT_MS;

  while (!isDone()) {
    const now = performance.now();
    const isLate = now > deadline;

    if (isLate) throw new Error(`${name}: timed out after ${WAIT_LIMIT_MS} ms`);

    await sleep(POLL_MS);
  }
};

/**
 * Spec §5.3 "revealing the view": focuses the Turbo Console container, waits until the view first showed the root's
 * packages (the "tree visible" span closed), then until the root's load settled.
 */
export const revealTree = async (api: TurboConsoleApi, root: string): Promise<void> => {
  const isVisible = (): boolean => {
    const span = api.timings.treeVisible.get(root);

    return typeof span?.end === 'number';
  };

  await vscode.commands.executeCommand('workbench.view.extension.turboConsole');
  await waitFor('tree visible', isVisible);
  await api.whenIdle(root);
};

/** Runs one named step: logs `ok <name> (<ms> ms)`, or rethrows the failure with the step's name. */
export const step = async (name: string, fn: () => Promise<void> | void): Promise<void> => {
  const start = performance.now();

  try {
    await fn();
  } catch (error) {
    const detail = String(error);

    throw new Error(`${name} failed: ${detail}`, { cause: error });
  }

  const ms = performance.now() - start;

  log(`ok ${name} (${ms.toFixed(1)} ms)`);
};

/**
 * Logs a timing and asserts it is within `limitMs` times the env's budget factor (spec §5.3 case 9: 1× locally, 3× on
 * CI). A miss is appended to the env's miss file before the throw, so the harness can relaunch on a timing miss and not
 * on a functional failure. A non-finite timing, such as one never measured, is a functional failure: it throws without
 * recording a miss.
 */
export const budget = (name: string, ms: number, limitMs: number, env: SuiteEnv): void => {
  const limit = limitMs * env.budgetFactor;

  log(`timing ${name}: ${ms.toFixed(1)} ms (budget ${limit.toFixed(1)} ms)`);

  const isMeasured = Number.isFinite(ms);

  if (!isMeasured) throw new Error(`${name}: timing never measured (${ms})`);

  if (ms <= limit) return;

  const miss = `${name} took ${ms.toFixed(1)} ms, over its ${limit} ms budget`;

  appendFileSync(env.missFile, `${miss}\n`);

  throw new Error(miss);
};

/** A suite's last step: writes the harness's done-marker, which the harness checks after VS Code exits. */
export const markDone = async (env: SuiteEnv): Promise<void> => {
  await writeFile(env.doneFile, 'done\n');
};
