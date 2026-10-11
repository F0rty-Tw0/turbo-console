import type { BenchResult } from '../common/bench.type.ts';
import { runBenches } from '../domain-logic/bench-run.ts';

const NS_PER_MS = 1_000_000;

const formatResult = (result: BenchResult): string => {
  const medianMsValue = result.medianNs / NS_PER_MS;
  const medianMs = medianMsValue.toFixed(3);
  const gate = result.gate ? 'gated' : 'not gated';

  return `${result.name}: median ${medianMs} ms over ${result.samples} samples (${gate})\n`;
};

/** Runs the package's benches from `packageDir` and prints one line per bench: 0 on success, 1 when any bench file or bench fails. */
export const runBenchesCli = async (packageDir: string): Promise<number> => {
  try {
    const results = await runBenches(packageDir);

    for (const result of results) process.stdout.write(formatResult(result));

    return 0;
  } catch (error) {
    const text = String(error);
    const message = error instanceof Error ? error.message : text;

    process.stderr.write(`run-benches: ${message}\n`);

    return 1;
  }
};
