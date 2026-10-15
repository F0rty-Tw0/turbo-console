import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { watchMemory } from './watch-memory.ts';

const INTERVAL_MS = 1000;
const MAX_RSS_BYTES = 200;

type Probe = (pid: number) => Promise<number | null>;

const probeOf = (...samples: (number | null)[]): ReturnType<typeof vi.fn<Probe>> => {
  const probe = vi.fn<Probe>();

  for (const sample of samples) probe.mockResolvedValueOnce(sample);

  return probe;
};

type RefHolder = { readonly hasRef: () => boolean };

/** A fake timer reports whether it still keeps the process alive through `hasRef`. */
const isRefHolder = (value: unknown): value is RefHolder => {
  return value instanceof Object && 'hasRef' in value && typeof value.hasRef === 'function';
};

describe('FEATURE: watch a process for runaway memory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a watcher on pid 42', () => {
    it('WHEN less than one interval passed THEN nothing is probed', async () => {
      const probe = probeOf(100);

      watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded: vi.fn() });

      await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);

      expect(probe).not.toHaveBeenCalled();
    });

    it('WHEN one interval passed THEN the pid is probed once', async () => {
      const probe = probeOf(100);

      watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded: vi.fn() });

      await vi.advanceTimersByTimeAsync(INTERVAL_MS);

      expect(probe).toHaveBeenCalledExactlyOnceWith(42);
    });

    it('WHEN a sample equals the bound THEN it is not exceeded', async () => {
      const onExceeded = vi.fn();
      const probe = probeOf(MAX_RSS_BYTES);

      watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded });

      await vi.advanceTimersByTimeAsync(INTERVAL_MS);

      expect(onExceeded).not.toHaveBeenCalled();
    });

    it('WHEN every timer is created THEN it is unref-ed', async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const probe = probeOf(100, 100);

      watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded: vi.fn() });

      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);

      const timers = setTimeoutSpy.mock.results.map((result): unknown => result.value);
      const refs = timers.filter(isRefHolder).map((timer) => timer.hasRef());

      expect(refs).toStrictEqual([false, false, false]);
    });
  });

  describe('GIVEN samples 100, null, 300 and a bound of 200', () => {
    it('WHEN the third poll runs THEN onExceeded gets 300 once and polling ends', async () => {
      const onExceeded = vi.fn();
      const probe = probeOf(100, null, 300);

      watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded });

      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 10);

      expect(onExceeded).toHaveBeenCalledExactlyOnceWith(300);
      expect(probe).toHaveBeenCalledTimes(3);
    });
  });

  describe('GIVEN a probe that rejects once', () => {
    it('WHEN the next sample exceeds THEN the rejection was treated as null and polling went on', async () => {
      const onExceeded = vi.fn();
      const probe = vi.fn<Probe>().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(300);

      watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded });

      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);

      expect(onExceeded).toHaveBeenCalledExactlyOnceWith(300);
    });
  });

  describe('GIVEN a probe that takes three intervals', () => {
    it('WHEN it is pending THEN no second probe starts, and the next poll waits one interval after it settles', async () => {
      const { promise, resolve } = Promise.withResolvers<number | null>();
      const probe = vi.fn<Probe>().mockReturnValueOnce(promise).mockResolvedValue(100);

      watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded: vi.fn() });

      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 4);
      expect(probe).toHaveBeenCalledOnce();

      resolve(100);
      await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);
      expect(probe).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(1);
      expect(probe).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a stopped watcher', () => {
    it('WHEN stopped before the first poll THEN nothing is probed', async () => {
      const probe = probeOf(100);
      const stop = watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded: vi.fn() });

      stop();
      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);

      expect(probe).not.toHaveBeenCalled();
    });

    it('WHEN stopped while a probe runs and it resolves over the bound THEN onExceeded is not called and nothing else is probed', async () => {
      const onExceeded = vi.fn();
      const { promise, resolve } = Promise.withResolvers<number | null>();
      const probe = vi.fn<Probe>().mockReturnValue(promise);
      const stop = watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe, onExceeded });

      await vi.advanceTimersByTimeAsync(INTERVAL_MS);

      stop();
      resolve(900);
      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);

      expect(onExceeded).not.toHaveBeenCalled();
      expect(probe).toHaveBeenCalledOnce();
    });

    it('WHEN stop is called twice THEN it does not throw', () => {
      const stop = watchMemory(42, { maxRssBytes: MAX_RSS_BYTES, intervalMs: INTERVAL_MS, probe: probeOf(), onExceeded: vi.fn() });

      stop();

      expect(() => {
        stop();
      }).not.toThrow();
    });
  });
});
