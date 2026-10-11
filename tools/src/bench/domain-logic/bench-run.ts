import { basename } from 'node:path';

import { SAMPLES, WARMUP } from '../common/bench.const.ts';
import { benchModuleSchema } from '../common/bench.schema.ts';
import type { BenchDescriptor, BenchResult } from '../common/bench.type.ts';
import { findBenchFiles, importBenchFile } from '../data-access/bench-files.ts';
import { writeBenchResults } from '../data-access/bench-results.ts';
import { sampleBench } from '../data-access/bench-sampling.ts';
import { median } from '../utils/median.util.ts';

const loadDescriptors = async (file: string): Promise<BenchDescriptor[]> => {
  const module = await importBenchFile(file);
  const parsed = benchModuleSchema.safeParse(module);

  if (!parsed.success) throw new Error(`${file}: the default export must be an array of bench(name, fn, { gate }) descriptors`);

  return parsed.data.default;
};

const claimNames = (fileByName: Map<string, string>, file: string, descriptors: BenchDescriptor[]): void => {
  for (const descriptor of descriptors) {
    const firstFile = fileByName.get(descriptor.name);

    if (firstFile !== undefined) throw new Error(`${firstFile} and ${file}: duplicate bench name "${descriptor.name}"`);

    fileByName.set(descriptor.name, file);
  }
};

const measure = async (packageName: string, descriptor: BenchDescriptor): Promise<BenchResult> => {
  const durations = await sampleBench(descriptor, WARMUP, SAMPLES);
  const medianNs = median(durations);
  const result: BenchResult = {
    name: `${packageName}/${descriptor.name}`,
    medianNs,
    samples: durations.length,
    gate: descriptor.gate
  };

  return result;
};

/**
 * Loads every bench file under `packageDir` before timing anything, so a malformed file or a bench name declared twice
 * fails fast and leaves no results file. Then samples each bench in file order, names it `<basename(packageDir)>/<bench>`, and writes
 * `.bench/results.json`.
 */
export const runBenches = async (packageDir: string): Promise<BenchResult[]> => {
  const files = await findBenchFiles(packageDir);
  const packageName = basename(packageDir);
  const fileByName = new Map<string, string>();
  const descriptors: BenchDescriptor[] = [];
  const results: BenchResult[] = [];

  for (const file of files) {
    const fileDescriptors = await loadDescriptors(file);

    claimNames(fileByName, file, fileDescriptors);
    descriptors.push(...fileDescriptors);
  }

  for (const descriptor of descriptors) results.push(await measure(packageName, descriptor));

  await writeBenchResults(packageDir, results);

  return results;
};
