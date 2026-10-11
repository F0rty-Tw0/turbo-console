import type { BenchDescriptor } from '../common/bench.type.ts';

const timeCall = async (fn: () => unknown): Promise<number> => {
  const start = process.hrtime.bigint();

  await fn();

  const end = process.hrtime.bigint();

  return Number(end - start);
};

/**
 * Calls `descriptor.fn` `warmup` times untimed, then `samples` times timed, one call at a time; a returned promise is
 * awaited inside its sample. Resolves with the `samples` durations in nanoseconds.
 */
export const sampleBench = async (descriptor: BenchDescriptor, warmup: number, samples: number): Promise<number[]> => {
  const durations: number[] = [];

  for (let call = 0; call < warmup; call += 1) await descriptor.fn();

  for (let call = 0; call < samples; call += 1) durations.push(await timeCall(descriptor.fn));

  return durations;
};
