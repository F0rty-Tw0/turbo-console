import { ChildProcess } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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

const rejectionOf = (rejection: unknown): unknown => rejection;

describe('FEATURE: runTurbo abort before the spawn has a pid', () => {
  describe('GIVEN a missing binary, whose spawn error is still a tick away', () => {
    describe('WHEN the caller aborts in the microtask after the spawn call', () => {
      let rejection: unknown;
      let killCount = 0;

      beforeAll(async () => {
        const kill = vi.spyOn(ChildProcess.prototype, 'kill').mockReturnValue(false);
        const run = runTurbo(join(tmpdir(), 'missing-turbo'), [], tmpdir(), { signal: controller.signal });

        rejection = await run.catch(rejectionOf);
        killCount = kill.mock.calls.length;
      }, 1000);

      afterAll(() => {
        vi.restoreAllMocks();
      });

      it('THEN runTurbo rejects with an AbortError', () => {
        expect(rejection).toMatchObject({ name: 'AbortError' });
      });

      it('THEN no kill is sent, since on macOS the pid is 0 then and a kill would signal our own process group', () => {
        expect(killCount).toBe(0);
      });
    });
  });
});
