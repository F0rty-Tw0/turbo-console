import { THRESHOLD } from '../common/bench.const.ts';
import type { BenchComparison } from '../common/bench.type.ts';
import { readRunsDir } from '../data-access/bench-runs.ts';
import { compareBenches, reduceRuns } from '../utils/bench-compare.util.ts';

/** Reduces each runs dir to one result per bench and compares head against base at `THRESHOLD`; `null` when base has no results. */
export const compareRunsDirs = async (baseDir: string, headDir: string): Promise<BenchComparison | null> => {
  const baseRuns = await readRunsDir(baseDir);
  const headRuns = await readRunsDir(headDir);
  const base = reduceRuns(baseRuns);
  const head = reduceRuns(headRuns);

  if (base.length === 0) return null;

  return compareBenches(base, head, THRESHOLD);
};
