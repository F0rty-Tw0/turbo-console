import { describe, expect, it, vi } from 'vitest';

import { raceSignal } from './race-signal.util.ts';

describe('FEATURE: race work against a signal', () => {
  describe('GIVEN work that settles before the signal aborts', () => {
    it('WHEN it resolves THEN the value is returned and no abort listener is left', async () => {
      const controller = new AbortController();
      const removed = vi.spyOn(controller.signal, 'removeEventListener');

      const value = await raceSignal(async () => Promise.resolve('done'), controller.signal);

      expect(value).toBe('done');
      expect(removed).toHaveBeenCalledOnce();
    });

    it('WHEN it rejects THEN the rejection passes through and no abort listener is left', async () => {
      const controller = new AbortController();
      const removed = vi.spyOn(controller.signal, 'removeEventListener');

      const settled = raceSignal(async () => Promise.reject(new Error('boom')), controller.signal);

      await expect(settled).rejects.toThrow('boom');
      expect(removed).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN work that never settles', () => {
    it('WHEN the signal aborts THEN it rejects with the signal reason', async () => {
      const controller = new AbortController();
      const reason = new Error('stop');

      const settled = raceSignal(async () => new Promise<string>(() => undefined), controller.signal);

      controller.abort(reason);

      await expect(settled).rejects.toBe(reason);
    });
  });

  describe('GIVEN work that aborts the signal and then hands back a settled value', () => {
    it('WHEN raced THEN it rejects with the reason, not the value', async () => {
      const controller = new AbortController();
      const reason = new Error('stop');
      const settledValue = Promise.resolve('late');

      // eslint-disable-next-line @typescript-eslint/promise-function-async -- an async wrapper settles a tick later and loses the race even without the check under test.
      const settled = raceSignal(() => {
        controller.abort(reason);

        return settledValue;
      }, controller.signal);

      await expect(settled).rejects.toBe(reason);
    });
  });

  describe('GIVEN a signal already aborted', () => {
    it('WHEN raced THEN it rejects with the reason and the work never starts', async () => {
      const controller = new AbortController();
      const work = vi.fn(async () => Promise.resolve('done'));
      const reason = new Error('stop');

      controller.abort(reason);

      await expect(raceSignal(work, controller.signal)).rejects.toBe(reason);
      expect(work).not.toHaveBeenCalled();
    });
  });
});
