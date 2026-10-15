import type * as childProcess from 'node:child_process';
import { ChildProcess } from 'node:child_process';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { killTree } from './kill-tree.ts';

/** Thrown synchronously, as execFile does for a spawn error such as ENOMEM. */
vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof childProcess>();

  const execFile = (): never => {
    throw Object.assign(new Error('spawn ENOMEM'), { code: 'ENOMEM' });
  };

  const mocked = { ...real, execFile };

  return mocked;
});

const REAL_PLATFORM = process.platform;

describe('FEATURE: kill a turbo process tree', () => {
  describe('GIVEN Windows and an execFile that throws synchronously', () => {
    beforeAll(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    afterAll(() => {
      Object.defineProperty(process, 'platform', { value: REAL_PLATFORM });
    });

    describe('WHEN the tree of a child with a pid is killed', () => {
      let outcome = '';
      let killCount = 0;

      beforeAll(async () => {
        const child = Object.assign(new ChildProcess(), { pid: 42 });
        const kill = vi.spyOn(child, 'kill').mockReturnValue(true);

        outcome = await killTree(child).then(
          () => 'resolved',
          () => 'rejected'
        );
        killCount = kill.mock.calls.length;
      });

      it('THEN it resolves, never rejects', () => {
        expect(outcome).toBe('resolved');
      });

      it('THEN it falls back to a plain kill of the child', () => {
        expect(killCount).toBe(1);
      });
    });
  });
});
