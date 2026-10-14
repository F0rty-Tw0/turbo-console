import { describe, expect, it, vi } from 'vitest';

import { untilAborted } from './until-aborted.ts';

const ABORTED = { name: 'AbortError', message: 'turbo aborted' };

describe('FEATURE: wait for work until a signal aborts', () => {
  describe('GIVEN no signal', () => {
    it('WHEN the work resolves THEN its value is returned', async () => {
      const value = await untilAborted(async () => Promise.resolve('done'), undefined);

      expect(value).toBe('done');
    });
  });

  describe('GIVEN a signal already aborted', () => {
    it('WHEN waited on THEN it rejects AbortError and the work never starts', async () => {
      const start = vi.fn(async () => Promise.resolve('done'));

      await expect(untilAborted(start, AbortSignal.abort())).rejects.toMatchObject(ABORTED);
      expect(start).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN work that never settles', () => {
    it('WHEN the signal aborts THEN it rejects AbortError carrying the reason and the listener is removed', async () => {
      const controller = new AbortController();
      const removed = vi.spyOn(controller.signal, 'removeEventListener');
      const reason = new Error('superseded');

      const waiting = untilAborted(async () => new Promise<string>(() => undefined), controller.signal);

      controller.abort(reason);

      await expect(waiting).rejects.toMatchObject({ ...ABORTED, cause: reason });
      expect(removed).toHaveBeenCalledOnce();
    });
  });
});
