import { describe, expect, it, vi } from 'vitest';

import { codiconReadyOf } from './codicon-ready.util.ts';
import { CODICON_WAIT_MS } from '../common/graph-glyph.const.ts';

/** One loaded face; the wait only counts faces. */
const FACES: unknown[] = [{}];

describe('FEATURE: codicon font wait', () => {
  describe('GIVEN a timer the spec runs by hand', () => {
    let fireTimer: () => void = () => undefined;
    const after = (run: () => void): void => {
      fireTimer = run;
    };

    it('WHEN the load resolves a face THEN it is ready', async () => {
      const ready = await codiconReadyOf(vi.fn().mockResolvedValue(FACES), CODICON_WAIT_MS, after);

      expect(ready).toBe(true);
    });

    it('WHEN the load resolves no face THEN it is not ready', async () => {
      const ready = await codiconReadyOf(vi.fn().mockResolvedValue([]), CODICON_WAIT_MS, after);

      expect(ready).toBe(false);
    });

    it('WHEN the load rejects THEN it is not ready and does not reject', async () => {
      const ready = await codiconReadyOf(vi.fn().mockRejectedValue(new Error('no font')), CODICON_WAIT_MS, after);

      expect(ready).toBe(false);
    });

    it('WHEN the load never settles and the timer runs THEN it is not ready', async () => {
      const pending = codiconReadyOf(async () => new Promise<unknown[]>(() => undefined), CODICON_WAIT_MS, after);

      fireTimer();

      expect(await pending).toBe(false);
    });

    it('WHEN a face resolves after the timer ran THEN it is still not ready', async () => {
      let resolveLoad: (faces: unknown[]) => void = () => undefined;
      const load = async (): Promise<unknown[]> => new Promise((resolve) => (resolveLoad = resolve));
      const pending = codiconReadyOf(load, CODICON_WAIT_MS, after);

      await Promise.resolve();

      fireTimer();
      resolveLoad(FACES);

      expect(await pending).toBe(false);
    });
  });
});
