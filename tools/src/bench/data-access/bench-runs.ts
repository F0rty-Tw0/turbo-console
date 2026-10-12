import { existsSync } from 'node:fs';
import { glob, lstat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { RESULTS_FILE } from '../common/bench.const.ts';
import { benchResultsSchema } from '../common/bench.schema.ts';
import type { BenchResult } from '../common/bench.type.ts';

const readResultsFile = async (file: string): Promise<BenchResult[]> => {
  const stats = await lstat(file);
  const isRegularFile = stats.isFile();

  if (!isRegularFile) throw new Error(`${file}: not a regular file`);

  const text = await readFile(file, 'utf8');
  const json: unknown = JSON.parse(text);
  const parsed = benchResultsSchema.safeParse(json);

  if (!parsed.success) throw new Error(`${file}: not a bench results file: ${parsed.error.message}`);

  return parsed.data;
};

const claimNames = (fileByName: Map<string, string>, file: string, results: BenchResult[]): void => {
  for (const result of results) {
    const firstFile = fileByName.get(result.name);

    if (firstFile === file) throw new Error(`${file}: repeats bench name "${result.name}"`);

    if (firstFile !== undefined) throw new Error(`${firstFile} and ${file}: duplicate bench name "${result.name}"`);

    fileByName.set(result.name, file);
  }
};

const readRun = async (runDir: string): Promise<BenchResult[]> => {
  const files: string[] = [];
  const fileByName = new Map<string, string>();
  const run: BenchResult[] = [];

  for await (const file of glob(`**/${RESULTS_FILE}`, { cwd: runDir })) files.push(join(runDir, file));

  for (const file of files.toSorted()) {
    const results = await readResultsFile(file);

    claimNames(fileByName, file, results);
    run.push(...results);
  }

  return run;
};

/**
 * One array per immediate subfolder of `dir` (one bench run), in name order, merging every `**\/results.json` under it in
 * path order. `[]` when `dir` is missing or has no subfolders; throws naming a file that is not a regular file (a
 * symlink), is outside the bench JSON contract, or repeats a bench name already in its run.
 */
export const readRunsDir = async (dir: string): Promise<BenchResult[][]> => {
  const exists = existsSync(dir);
  const runs: BenchResult[][] = [];

  if (!exists) return runs;

  const entries = await readdir(dir, { withFileTypes: true });
  const runDirs = entries.filter((entry) => entry.isDirectory());
  const runNames = runDirs.map((entry) => entry.name);

  for (const runName of runNames.toSorted()) runs.push(await readRun(join(dir, runName)));

  return runs;
};
