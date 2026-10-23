import { median } from './bench-stats.ts';
import type { Annotation, BenchRow, BenchSample } from './common/bench.type.ts';

const BENCH_PREFIX = 'webview-ui/';
const SAMPLE_TYPE = 'bench-sample';
const ROW_NAME = /^[\w@./ -]+$/u;
const NS_PER_MS = 1_000_000;

type SampleGroup = [string, BenchSample[]];

const isBenchSample = (value: unknown): value is BenchSample => {
  if (typeof value !== 'object' || value === null) return false;

  const hasName = 'name' in value && typeof value.name === 'string';
  const hasMs = 'ms' in value && typeof value.ms === 'number';
  const hasGate = 'gate' in value && typeof value.gate === 'boolean';

  return hasName && hasMs && hasGate;
};

export const sampleAnnotation = (sample: BenchSample): Annotation => {
  const annotation: Annotation = { type: SAMPLE_TYPE, description: JSON.stringify(sample) };

  return annotation;
};

export const sampleOf = (annotation: Annotation): BenchSample | null => {
  if (annotation.type !== SAMPLE_TYPE) return null;

  const parsed: unknown = JSON.parse(annotation.description ?? '');

  if (!isBenchSample(parsed)) throw new Error(`${SAMPLE_TYPE} annotation is not a sample: ${annotation.description}`);

  return parsed;
};

const groupByName = (samples: BenchSample[]): Map<string, BenchSample[]> => {
  const groups = new Map<string, BenchSample[]>();

  for (const sample of samples) {
    const group = groups.get(sample.name) ?? [];

    group.push(sample);
    groups.set(sample.name, group);
  }

  return groups;
};

const msOf = (rowName: string, sample: BenchSample): number => {
  const isFinite = Number.isFinite(sample.ms);
  const isPositive = isFinite && sample.ms > 0;

  if (!isPositive) throw new Error(`bench row ${rowName} has a sample that is not a positive number: ${sample.ms}`);

  return sample.ms;
};

const gateOf = (rowName: string, samples: BenchSample[]): boolean => {
  const gates = new Set(samples.map((sample) => sample.gate));

  if (gates.size > 1) throw new Error(`bench row ${rowName} has samples with different gate values`);

  return gates.has(true);
};

const rowOf = ([name, samples]: SampleGroup): BenchRow => {
  const rowName = BENCH_PREFIX + name;
  const isNameValid = ROW_NAME.test(rowName);

  if (!isNameValid) throw new Error(`bench row name is not allowed: ${JSON.stringify(rowName)}`);

  const times = samples.map((sample) => msOf(rowName, sample));
  const medianNs = median(times) * NS_PER_MS;
  const gate = gateOf(rowName, samples);
  const row: BenchRow = { name: rowName, medianNs, samples: samples.length, gate };

  return row;
};

export const resultsOf = (samples: BenchSample[]): BenchRow[] => {
  const groups = groupByName(samples);

  return Array.from(groups, rowOf);
};
