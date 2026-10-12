import type { BenchDescriptor, BenchOptions } from '../common/bench.type.ts';

/** Describes one bench for a `*.bench.ts` default export; pure, so a bench file is a plain list with no registry. */
export const bench = (name: string, fn: () => unknown, options: BenchOptions): BenchDescriptor => {
  const descriptor: BenchDescriptor = { name, fn, gate: options.gate };

  return descriptor;
};
