import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runTurbo } from './run-turbo.ts';

const controller = vi.hoisted(() => new AbortController());

/** runTurbo calls `collectStderr` right after `execFile`: the abort lands after its listener, before the spawn `error` tick. */
vi.mock('./collect-stderr.ts', () => {
  const abort = (): void => controller.abort();
  const readNothing = (): string => '';

  const collectStderr = (): (() => string) => {
    queueMicrotask(abort);

    return readNothing;
  };

  const mocked = { collectStderr };

  return mocked;
});

describe('FEATURE: runTurbo abort before the spawn has a pid', () => {
  describe('GIVEN a missing binary, whose spawn error is still a tick away', () => {
    it('WHEN the caller aborts in the microtask after the spawn call THEN runTurbo rejects with an AbortError', async () => {
      const run = runTurbo(join(tmpdir(), 'missing-turbo'), [], tmpdir(), { signal: controller.signal });

      await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    }, 1000);
  });
});
