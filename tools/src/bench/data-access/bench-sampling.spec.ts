import { describe, expect, it, vi } from 'vitest';

import { sampleBench } from './bench-sampling.ts';
import type { BenchDescriptor } from '../common/bench.type.ts';

describe('FEATURE: bench sampling', () => {
  describe('GIVEN a synchronous bench', () => {
    describe('WHEN sampled with 2 warmup calls and 5 samples', () => {
      it('THEN it returns 5 non-negative durations', async () => {
        const descriptor: BenchDescriptor = { name: 'sync', fn: vi.fn(), gate: true };

        const samples = await sampleBench(descriptor, 2, 5);
        const negative = samples.filter((sample) => sample < 0);

        expect(samples).toHaveLength(5);
        expect(negative).toStrictEqual([]);
      });

      it('THEN it calls the bench 7 times', async () => {
        const fn = vi.fn();
        const descriptor: BenchDescriptor = { name: 'sync', fn, gate: true };

        await sampleBench(descriptor, 2, 5);

        expect(fn).toHaveBeenCalledTimes(7);
      });
    });
  });

  describe('GIVEN an asynchronous bench', () => {
    it('WHEN sampled THEN each call settles before the next one starts', async () => {
      let running = 0;
      let overlaps = 0;

      const fn = async (): Promise<void> => {
        if (running > 0) overlaps += 1;

        running += 1;
        await new Promise<void>((resolve) => setImmediate(resolve));
        running -= 1;
      };

      const descriptor: BenchDescriptor = { name: 'async', fn, gate: false };

      await sampleBench(descriptor, 1, 3);

      expect(overlaps).toBe(0);
    });

    it('WHEN sampled THEN each duration covers the awaited work', async () => {
      const fn = async (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 20));
      const descriptor: BenchDescriptor = { name: 'async', fn, gate: false };

      const samples = await sampleBench(descriptor, 0, 2);
      const shortest = Math.min(...samples);

      expect(shortest).toBeGreaterThan(10_000_000);
    });
  });
});
