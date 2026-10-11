import { z } from 'zod';

import type { BenchDescriptor, BenchResult } from './bench.type.ts';

const benchResultSchema = z.object({
  name: z.string(),
  medianNs: z.number(),
  samples: z.number().int().positive(),
  gate: z.boolean()
});

/** `.bench/results.json`: the bench JSON contract that `bench-compare` reads. */
export const benchResultsSchema = z.array(benchResultSchema) satisfies z.ZodType<BenchResult[]>;

const benchFnSchema = z.custom<() => unknown>((value) => typeof value === 'function', 'expected a function');

const benchDescriptorSchema = z.object({
  name: z.string().min(1),
  fn: benchFnSchema,
  gate: z.boolean()
});

const benchDescriptorsSchema = z.array(benchDescriptorSchema) satisfies z.ZodType<BenchDescriptor[]>;

/** A `*.bench.ts` module namespace: its default export is the list of `bench(...)` descriptors. */
export const benchModuleSchema = z.object({ default: benchDescriptorsSchema });
