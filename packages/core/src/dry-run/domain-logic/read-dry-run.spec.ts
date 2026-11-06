import { beforeAll, describe, expect, it, vi } from 'vitest';

import { readDryRun } from './read-dry-run.ts';
import { TurboBinary } from '../../binary/common/turbo-binary.ts';
import type { ExitStallCheck, RunTurboOptions, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import type * as runTurboModule from '../../shared/turbo/data-access/run-turbo.ts';
import { isJsonEnd, jsonExitCode } from '../../shared/turbo/utils/stalled-exit-code.util.ts';

const runTurbo = vi.hoisted(() => vi.fn<typeof runTurboModule.runTurbo>());

/** Records the options readDryRun passes; real binaries are covered by the contract specs. */
vi.mock('../../shared/turbo/data-access/run-turbo.ts', () => {
  const mocked = { runTurbo };

  return mocked;
});

const RESULT: TurboResult = { stdout: '', stderr: '', exitCode: 1 };

const rejectionOf = (rejection: unknown): unknown => rejection;

describe('FEATURE: readDryRun exit-stall check', () => {
  let options: RunTurboOptions | undefined;

  beforeAll(async () => {
    runTurbo.mockResolvedValue(RESULT);
    const binary = new TurboBinary('/repo', '/repo/turbo', '2.11.7', 'workspace');

    await readDryRun(binary, { tasks: ['build'] }).catch(rejectionOf);
    options = runTurbo.mock.lastCall?.[3];
  });

  describe('GIVEN a dry run request', () => {
    it('WHEN readDryRun runs turbo THEN it passes the JSON check to runTurbo', () => {
      const expected: ExitStallCheck = { isEnd: isJsonEnd, exitCodeOf: jsonExitCode };

      expect(options?.exitStallCheck).toStrictEqual(expected);
    });
  });
});
