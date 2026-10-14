import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Debouncer } from './debouncer.ts';
import { stateOf } from '../../roots/test/utils/promise-state.spec.util.ts';

const DELAY_MS = 300;

describe('FEATURE: per-root debouncer', () => {
  let flush: Mock<(root: string) => void>;
  let debouncer: Debouncer;

  beforeEach(() => {
    vi.useFakeTimers();
    flush = vi.fn<(root: string) => void>();
    debouncer = new Debouncer(DELAY_MS, flush);
  });

  afterEach(() => {
    debouncer.dispose();
    vi.useRealTimers();
  });

  describe('GIVEN three pushes for one root, 100 ms apart', () => {
    beforeEach(() => {
      debouncer.push('/a');
      vi.advanceTimersByTime(100);
      debouncer.push('/a');
      vi.advanceTimersByTime(100);
      debouncer.push('/a');
    });

    it('WHEN the delay has not passed since the last push THEN nothing flushes', () => {
      vi.advanceTimersByTime(DELAY_MS - 1);

      expect(flush).not.toHaveBeenCalled();
    });

    it('WHEN the delay passes after the last push THEN the root flushes once', () => {
      vi.advanceTimersByTime(DELAY_MS);

      expect(flush).toHaveBeenCalledExactlyOnceWith('/a');
    });
  });

  describe('GIVEN pushes for two roots', () => {
    it('WHEN the delay passes THEN each root flushes on its own', () => {
      debouncer.push('/a');
      debouncer.push('/b');
      vi.advanceTimersByTime(DELAY_MS);

      expect(flush.mock.calls).toStrictEqual([['/a'], ['/b']]);
    });
  });

  describe('GIVEN a wait on a pending push and a second push 100 ms later', () => {
    let flushed: Promise<void>;

    beforeEach(() => {
      debouncer.push('/a');
      flushed = debouncer.whenFlushed('/a');
      vi.advanceTimersByTime(100);
      debouncer.push('/a');
    });

    it('WHEN the delay has not passed since the second push THEN the wait is still pending', async () => {
      await vi.advanceTimersByTimeAsync(DELAY_MS - 1);

      const state = stateOf(flushed);

      await vi.advanceTimersByTimeAsync(0);

      await expect(state).resolves.toBe('waiting');
    });

    it('WHEN the delay passes after the second push THEN the wait resolves', async () => {
      await vi.advanceTimersByTimeAsync(DELAY_MS);

      const state = stateOf(flushed);

      await vi.advanceTimersByTimeAsync(0);

      await expect(state).resolves.toBe('granted');
    });

    it('WHEN the delay passes after the second push THEN the root flushes once', async () => {
      await vi.advanceTimersByTimeAsync(DELAY_MS);

      expect(flush).toHaveBeenCalledExactlyOnceWith('/a');
    });
  });

  describe('GIVEN no push', () => {
    it('WHEN a root is awaited THEN it resolves at once', async () => {
      const flushed = debouncer.whenFlushed('/a');
      const state = stateOf(flushed);

      await vi.advanceTimersByTimeAsync(0);

      await expect(state).resolves.toBe('granted');
    });
  });

  describe('GIVEN a pending push', () => {
    let flushed: Promise<void>;

    beforeEach(() => {
      debouncer.push('/a');
      flushed = debouncer.whenFlushed('/a');
    });

    it('WHEN the delay has not passed THEN the wait is still pending', async () => {
      await vi.advanceTimersByTimeAsync(DELAY_MS - 1);

      const state = stateOf(flushed);

      await vi.advanceTimersByTimeAsync(0);

      await expect(state).resolves.toBe('waiting');
    });

    it('WHEN the delay passes THEN the wait resolves after the flush', async () => {
      await vi.advanceTimersByTimeAsync(DELAY_MS);
      await flushed;

      expect(flush).toHaveBeenCalledExactlyOnceWith('/a');
    });

    it('WHEN another root is awaited THEN it resolves at once', async () => {
      const other = debouncer.whenFlushed('/b');
      const state = stateOf(other);

      await vi.advanceTimersByTimeAsync(0);

      await expect(state).resolves.toBe('granted');
    });

    it('WHEN it is disposed THEN nothing flushes', () => {
      debouncer.dispose();
      vi.advanceTimersByTime(DELAY_MS);

      expect(flush).not.toHaveBeenCalled();
    });

    it('WHEN it is disposed THEN the wait resolves', async () => {
      debouncer.dispose();

      await expect(flushed).resolves.toBeUndefined();
    });

    it('WHEN it is disposed THEN later pushes flush nothing', () => {
      debouncer.dispose();
      debouncer.push('/a');
      vi.advanceTimersByTime(DELAY_MS);

      expect(flush).not.toHaveBeenCalled();
    });
  });
});
