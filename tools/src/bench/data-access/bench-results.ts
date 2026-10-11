import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BENCH_DIR, RESULTS_FILE } from '../common/bench.const.ts';
import { benchResultsSchema } from '../common/bench.schema.ts';
import type { BenchResult } from '../common/bench.type.ts';

/**
 * Writes `results` to `<dir>/.bench/results.json`, replacing an earlier run's file. Throws naming `dir`, and writes
 * nothing, when the results are outside the bench JSON contract that `bench-compare` reads.
 */
export const writeBenchResults = async (dir: string, results: BenchResult[]): Promise<void> => {
  const parsed = benchResultsSchema.safeParse(results);

  if (!parsed.success) throw new Error(`${dir}: results outside the bench JSON contract: ${parsed.error.message}`);

  const outDir = join(dir, BENCH_DIR);
  const json = JSON.stringify(parsed.data, null, 2);

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, RESULTS_FILE), `${json}\n`);
};
