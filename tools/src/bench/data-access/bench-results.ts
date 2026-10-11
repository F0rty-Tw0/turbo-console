import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BENCH_DIR, RESULTS_FILE } from '../common/bench.const.ts';
import type { BenchResult } from '../common/bench.type.ts';

/** Writes `results` to `<dir>/.bench/results.json`, replacing an earlier run's file. */
export const writeBenchResults = async (dir: string, results: BenchResult[]): Promise<void> => {
  const outDir = join(dir, BENCH_DIR);
  const json = JSON.stringify(results, null, 2);

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, RESULTS_FILE), `${json}\n`);
};
