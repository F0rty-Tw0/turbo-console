import { z } from 'zod';

import type { BenchDescriptor, BenchResult } from './bench.type.ts';

const BENCH_NAME_PATTERN = /^[\w@./ -]+$/u;
const BENCH_NAME_RULE = 'bench names may hold only letters, digits, spaces and _ @ . / -';

/** Letters, digits, `_ @ . / -` and spaces only: names reach CI logs, where a newline could forge a workflow command. */
const benchNameSchema = z.string().min(1).max(200).regex(BENCH_NAME_PATTERN, BENCH_NAME_RULE);

const benchResultSchema = z.object({
  name: benchNameSchema,
  medianNs: z.number().positive(),
  samples: z.number().int().positive(),
  gate: z.boolean()
});

/** `.bench/results.json`: the bench JSON contract that `bench-compare` reads. */
export const benchResultsSchema = z.array(benchResultSchema) satisfies z.ZodType<BenchResult[]>;

const benchFnSchema = z.custom<() => unknown>((value) => typeof value === 'function', 'expected a function');

const benchDescriptorSchema = z.object({
  name: benchNameSchema,
  fn: benchFnSchema,
  gate: z.boolean()
});

const benchDescriptorsSchema = z.array(benchDescriptorSchema) satisfies z.ZodType<BenchDescriptor[]>;

/** A `*.bench.ts` module namespace: its default export is the list of `bench(...)` descriptors. */
export const benchModuleSchema = z.object({ default: benchDescriptorsSchema });
