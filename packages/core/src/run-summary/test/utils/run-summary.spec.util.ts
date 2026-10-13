import { mkdir, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RunSummary } from '../../../shared/turbo/common/turbo.type.ts';
import type { RunWindow } from '../common/run-window.type.ts';
import { RUN_SUMMARY_STUB } from '../stubs/run-summary.stub.ts';

export const runsDirOf = (root: string): string => join(root, '.turbo', 'runs');

/** A workspace root `<parent>/<name>` with an empty `.turbo/runs`. */
export const newRunsRoot = async (parent: string, name: string): Promise<string> => {
  const root = join(parent, name);

  await mkdir(runsDirOf(root), { recursive: true });

  return root;
};

/** Writes `text` to `.turbo/runs/<name>` with both times set to `seconds`. */
export const writeRun = async (root: string, name: string, text: string, seconds: number): Promise<void> => {
  const path = join(runsDirOf(root), name);

  await writeFile(path, text);
  await utimes(path, seconds, seconds);
};

/** `RUN_SUMMARY_STUB` with `id`, as JSON. */
export const summaryText = (id: string): string => {
  const summary: RunSummary = { ...RUN_SUMMARY_STUB, id };

  return JSON.stringify(summary);
};

/** One task entry of a summary: `taskId` ran over `span` and ended with cache `status`, exit code 0. */
export const taskEntry = (taskId: string, span: RunWindow, status: 'HIT' | 'MISS'): RunSummary['tasks'][number] => {
  const execution = { ...span, exitCode: 0 };
  const cache = { status };
  const entry = { taskId, execution, cache };

  return entry;
};

/** A summary of the turbo process `command`, which ran over `window` and ended with `exitCode`, listing `tasks`. */
export const summaryOf = (command: string, window: RunWindow, exitCode: number, tasks: RunSummary['tasks']): RunSummary => {
  const execution = { command, ...window, exitCode };
  const summary: RunSummary = { ...RUN_SUMMARY_STUB, execution, tasks };

  return summary;
};

/** `summaryOf(...)` as JSON. */
export const summaryJson = (command: string, window: RunWindow, exitCode: number, tasks: RunSummary['tasks']): string => {
  const summary = summaryOf(command, window, exitCode, tasks);

  return JSON.stringify(summary);
};
