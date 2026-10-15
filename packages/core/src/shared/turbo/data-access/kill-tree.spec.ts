import type * as childProcess from 'node:child_process';
import { ChildProcess } from 'node:child_process';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { killTree } from './kill-tree.ts';
import type { KillOutcome } from '../test/common/turbo.type.ts';

/** How the mocked taskkill ends: 'throws' (synchronously, as execFile does for ENOMEM), 'fails' or 'succeeds' (via the callback). */
const taskkill = vi.hoisted(() => {
  const state = { ending: 'throws' };

  return state;
});

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof childProcess>();

  const execFile = (...args: unknown[]): void => {
    if (taskkill.ending === 'throws') throw Object.assign(new Error('spawn ENOMEM'), { code: 'ENOMEM' });

    const callback = args.at(-1) as (error: Error | null) => void;
    const exitError = new Error('taskkill exited with code 128');

    callback(taskkill.ending === 'fails' ? exitError : null);
  };

  const mocked = { ...real, execFile };

  return mocked;
});

const REAL_PLATFORM = process.platform;

/** Kills the tree of a child with a pid while taskkill ends as `ending`. */
const killWith = async (ending: string): Promise<KillOutcome> => {
  taskkill.ending = ending;

  const child = Object.assign(new ChildProcess(), { pid: 42 });
  const kill = vi.spyOn(child, 'kill').mockReturnValue(true);

  const settled = await killTree(child).then(
    () => 'resolved',
    () => 'rejected'
  );
  const result: KillOutcome = { settled, killCount: kill.mock.calls.length };

  return result;
};

describe('FEATURE: kill a turbo process tree', () => {
  describe('GIVEN Windows', () => {
    beforeAll(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    afterAll(() => {
      Object.defineProperty(process, 'platform', { value: REAL_PLATFORM });
    });

    describe('WHEN execFile throws synchronously', () => {
      let result: KillOutcome = { settled: '', killCount: 0 };

      beforeAll(async () => {
        result = await killWith('throws');
      });

      it('THEN it resolves, never rejects', () => {
        expect(result.settled).toBe('resolved');
      });

      it('THEN it falls back to a plain kill of the child', () => {
        expect(result.killCount).toBe(1);
      });
    });

    describe('WHEN taskkill reports an error', () => {
      let result: KillOutcome = { settled: '', killCount: 0 };

      beforeAll(async () => {
        result = await killWith('fails');
      });

      it('THEN it resolves after a plain kill of the child', () => {
        expect(result).toStrictEqual({ settled: 'resolved', killCount: 1 });
      });
    });

    describe('WHEN taskkill succeeds', () => {
      let result: KillOutcome = { settled: '', killCount: 0 };

      beforeAll(async () => {
        result = await killWith('succeeds');
      });

      it('THEN it resolves without a plain kill', () => {
        expect(result).toStrictEqual({ settled: 'resolved', killCount: 0 });
      });
    });
  });
});
