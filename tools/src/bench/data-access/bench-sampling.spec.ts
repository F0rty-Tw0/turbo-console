import { describe, expect, it, vi } from 'vitest';

import { sampleBench } from './bench-sampling.ts';
import { NS_PER_MS } from '../common/bench.const.ts';
import type { BenchDescriptor, Warmup } from '../common/bench.type.ts';

const TWO_CALLS: Warmup = { calls: 2, ms: 0 };

describe('FEATURE: bench sampling', () => {
  describe('GIVEN a synchronous bench', () => {
    describe('WHEN sampled with 2 warmup calls and 5 samples', () => {
      it('THEN it returns 5 non-negative durations', async () => {
        const descriptor: BenchDescriptor = { name: 'sync', fn: vi.fn(), gate: true };

        const samples = await sampleBench(descriptor, TWO_CALLS, 5);
        const negative = samples.filter((sample) => sample < 0);

        expect(samples).toHaveLength(5);
        expect(negative).toStrictEqual([]);
      });

      it('THEN it calls the bench 7 times', async () => {
        const fn = vi.fn();
        const descriptor: BenchDescriptor = { name: 'sync', fn, gate: true };

        await sampleBench(descriptor, TWO_CALLS, 5);

        expect(fn).toHaveBeenCalledTimes(7);
      });
    });
  });

  describe('GIVEN a fast bench and a warmup of 1 call or 30 ms', () => {
    it('WHEN sampled THEN it keeps warming past the 1 call until 30 ms have passed', async () => {
      const fn = vi.fn();
      const descriptor: BenchDescriptor = { name: 'fast', fn, gate: true };
      const start = process.hrtime.bigint();

      await sampleBench(descriptor, { calls: 1, ms: 30 }, 1);

      const elapsedMs = Number(process.hrtime.bigint() - start) / NS_PER_MS;

      expect(elapsedMs).toBeGreaterThanOrEqual(30);
      expect(fn.mock.calls.length).toBeGreaterThan(2);
    });
  });

  describe('GIVEN a bench slower than the warmup time', () => {
    it('WHEN sampled with 3 calls or 1 ms THEN it warms for exactly the 3 calls', async () => {
      const fn = vi.fn(async (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 5)));
      const descriptor: BenchDescriptor = { name: 'slow', fn, gate: true };

      await sampleBench(descriptor, { calls: 3, ms: 1 }, 1);

      expect(fn).toHaveBeenCalledTimes(4);
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

      await sampleBench(descriptor, { calls: 1, ms: 0 }, 3);

      expect(overlaps).toBe(0);
    });

    it('WHEN sampled THEN each duration covers the awaited work', async () => {
      const fn = async (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 20));
      const descriptor: BenchDescriptor = { name: 'async', fn, gate: false };

      const samples = await sampleBench(descriptor, { calls: 0, ms: 0 }, 2);
      const shortest = Math.min(...samples);

      expect(shortest).toBeGreaterThan(10_000_000);
    });
  });
});
