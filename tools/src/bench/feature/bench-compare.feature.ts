import { compareRunsDirs } from '../domain-logic/bench-comparison.ts';
import { formatComparison } from '../utils/bench-compare.util.ts';

/** Compares two runs dirs and prints the table: 0 when no gated bench regressed or base has no results, 1 on a regression, missing gated benches, or error. */
export const runBenchCompare = async (baseDir: string, headDir: string): Promise<number> => {
  try {
    const comparison = await compareRunsDirs(baseDir, headDir);

    if (comparison === null) {
      process.stdout.write('no baseline\n');

      return 0;
    }

    const table = formatComparison(comparison);

    process.stdout.write(table);

    return comparison.failed ? 1 : 0;
  } catch (error) {
    const text = String(error);
    const message = error instanceof Error ? error.message : text;

    process.stderr.write(`bench-compare: ${message}\n`);

    return 1;
  }
};
