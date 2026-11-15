import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import type { AtomResult } from '../common/atom-result.type.ts';
import { MAX_SUMMARY_TRIES } from '../common/run-summary.const.ts';
import { readAtomResults } from '../domain-logic/read-atom-results.ts';
import type { RunWindow } from './common/run-window.type.ts';
import { newRunsRoot, summaryJson, taskEntry, writeRun } from './utils/run-summary.spec.util.ts';

const TASKS_PER_SUMMARY = 200;

/** Seconds since the epoch of the oldest summary; each next one is a second newer. */
const OLDEST = 1_760_000_000;

const WINDOW: RunWindow = { startTime: 1000, endTime: 2000 };

/** In no summary, so a read never stops early and visits every file. */
const NEVER_RAN = '@fx/e2e#e2e-ci--tests/never.spec.ts';

const idOf = (run: number, task: number): string => `@fx/e2e#e2e-ci--tests/run-${run}/file-${task}.spec.ts`;

const summaryOfRun = (run: number): string => {
  const tasks = Array.from({ length: TASKS_PER_SUMMARY }, (_, task) => taskEntry(idOf(run, task), WINDOW, 'MISS'));

  return summaryJson('turbo run e2e-ci', WINDOW, 0, tasks);
};

/**
 * `readAtomResults` for one id of each of `MAX_SUMMARY_TRIES` summaries of `TASKS_PER_SUMMARY` tasks, after a first read
 * filled the cache: the listing and its stats, no summary read. The summaries stay on disk while timed and are removed
 * when the process exits: the runner times every bench after loading every file, so no dispose can run earlier.
 */
const warmReadBench = async (name: string): Promise<BenchDescriptor> => {
  const dir = mkdtempSync(join(tmpdir(), 'read-atom-results-bench-'));
  const removeDir = (): void => rmSync(dir, { recursive: true, force: true, maxRetries: 5 });

  process.once('exit', removeDir);

  const root = await newRunsRoot(dir, 'root');
  const runs = Array.from({ length: MAX_SUMMARY_TRIES }, (_, run) => run);

  for (const run of runs) await writeRun(root, `run-${run}.json`, summaryOfRun(run), OLDEST + run);

  const firstIds = runs.map((run) => idOf(run, 0));
  const wanted = new Set([...firstIds, NEVER_RAN]);
  const read = async (): Promise<Map<string, AtomResult>> => readAtomResults(root, wanted);

  await read();

  return bench(name, read, { gate: false });
};

const benches: BenchDescriptor[] = [await warmReadBench('read-atom-results-warm-20')];

export default benches;
