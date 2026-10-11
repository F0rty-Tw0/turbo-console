import { glob } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { BENCH_GLOB } from '../common/bench.const.ts';

/** Absolute paths of `src/**\/test/*.bench.ts` under `dir`, sorted so result order is stable across platforms. */
export const findBenchFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];

  for await (const file of glob(BENCH_GLOB, { cwd: dir })) files.push(join(dir, file));

  return files.toSorted();
};

/** Imports `file` (Node strips its types) and resolves with the module namespace, unvalidated. */
export const importBenchFile = async (file: string): Promise<unknown> => {
  const url = pathToFileURL(file);
  const module: unknown = await import(url.href);

  return module;
};
