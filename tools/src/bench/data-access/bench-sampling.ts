import { NS_PER_MS } from '../common/bench.const.ts';
import type { BenchDescriptor, Warmup } from '../common/bench.type.ts';

const timeCall = async (fn: () => unknown): Promise<number> => {
  const start = process.hrtime.bigint();

  await fn();

  const end = process.hrtime.bigint();

  return Number(end - start);
};

/** Untimed calls until both `warmup.calls` calls and `warmup.ms` milliseconds are done. */
const warmUp = async (descriptor: BenchDescriptor, warmup: Warmup): Promise<void> => {
  const end = process.hrtime.bigint() + BigInt(warmup.ms * NS_PER_MS);
  let calls = 0;

  while (calls < warmup.calls || process.hrtime.bigint() < end) {
    await descriptor.fn();
    calls += 1;
  }
};

/**
 * Warms `descriptor.fn` up untimed (`warmup`), then calls it `samples` times timed, one call at a time; a returned promise
 * is awaited inside its sample. Resolves with the `samples` durations in nanoseconds.
 */
export const sampleBench = async (descriptor: BenchDescriptor, warmup: Warmup, samples: number): Promise<number[]> => {
  const durations: number[] = [];

  await warmUp(descriptor, warmup);

  for (let call = 0; call < samples; call += 1) durations.push(await timeCall(descriptor.fn));

  return durations;
};
