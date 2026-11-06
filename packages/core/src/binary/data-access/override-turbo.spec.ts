import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { overrideVersion } from './override-turbo.ts';
import type { ExitStallCheck, RunTurboOptions, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import type * as runTurboModule from '../../shared/turbo/data-access/run-turbo.ts';
import { isVersionEnd, versionExitCode } from '../../shared/turbo/utils/stalled-exit-code.util.ts';

const runTurbo = vi.hoisted(() => vi.fn<typeof runTurboModule.runTurbo>());

/** Records the options overrideVersion passes; real binaries are covered by the contract specs. */
vi.mock('../../shared/turbo/data-access/run-turbo.ts', () => {
  const mocked = { runTurbo };

  return mocked;
});

const RESULT: TurboResult = { stdout: '2.11.7\n', stderr: '', exitCode: 0 };

describe('FEATURE: overrideVersion exit-stall check', () => {
  let dir = '';
  let options: RunTurboOptions | undefined;

  beforeAll(async () => {
    runTurbo.mockResolvedValue(RESULT);
    dir = await mkdtemp(join(tmpdir(), 'override-turbo-'));
    const binaryPath = join(dir, 'turbo');

    await writeFile(binaryPath, '');
    await overrideVersion(binaryPath, dir);
    options = runTurbo.mock.lastCall?.[3];
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN an override binary', () => {
    it('WHEN overrideVersion runs --version THEN it passes the version-line check to runTurbo', () => {
      const expected: ExitStallCheck = { isEnd: isVersionEnd, exitCodeOf: versionExitCode };

      expect(options?.exitStallCheck).toStrictEqual(expected);
    });
  });
});
