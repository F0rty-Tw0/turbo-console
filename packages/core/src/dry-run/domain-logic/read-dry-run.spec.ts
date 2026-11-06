import { beforeAll, describe, expect, it, vi } from 'vitest';

import { readDryRun } from './read-dry-run.ts';
import { TurboBinary } from '../../binary/common/turbo-binary.ts';
import type { RunTurboOptions, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import type * as runTurboModule from '../../shared/turbo/data-access/run-turbo.ts';

const runTurbo = vi.hoisted(() => vi.fn<typeof runTurboModule.runTurbo>());

/** Records the options readDryRun passes; real binaries are covered by the contract specs. */
vi.mock('../../shared/turbo/data-access/run-turbo.ts', () => {
  const mocked = { runTurbo };

  return mocked;
});

const RESULT: TurboResult = { stdout: '', stderr: '', exitCode: 1 };

const COMPLETE = '{\n  "tasks": []\n}\n';

const rejectionOf = (rejection: unknown): unknown => rejection;

describe('FEATURE: readDryRun exit-stall check', () => {
  let options: RunTurboOptions | undefined;

  beforeAll(async () => {
    runTurbo.mockResolvedValue(RESULT);
    const binary = new TurboBinary('/repo', '/repo/turbo', '2.11.7', 'workspace');

    await readDryRun(binary, { tasks: ['build'] }).catch(rejectionOf);
    options = runTurbo.mock.lastCall?.[3];
  });

  describe('GIVEN the check readDryRun passes to runTurbo', () => {
    it('WHEN a stalled dry run printed complete JSON THEN its exit code reads 0', () => {
      expect(options?.exitStallCheck?.exitCodeOf(COMPLETE)).toBe(0);
    });

    it('WHEN a stalled dry run printed cut-off JSON THEN it has no exit code', () => {
      expect(options?.exitStallCheck?.exitCodeOf('{\n  "tasks": [')).toBeNull();
    });

    it('WHEN the stdout tail ends the JSON object THEN it is an end', () => {
      expect(options?.exitStallCheck?.isEnd(COMPLETE)).toBe(true);
    });
  });
});
