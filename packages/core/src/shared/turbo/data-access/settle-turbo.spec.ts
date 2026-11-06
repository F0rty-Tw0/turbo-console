import type { ExecFileException } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { settleTurbo } from './settle-turbo.ts';
import type { ExitStallCheck, TurboOutput, TurboResult } from '../common/turbo.type.ts';
import { isJsonEnd, jsonExitCode } from '../utils/stalled-exit-code.util.ts';

const JSON_CHECK: ExitStallCheck = { isEnd: isJsonEnd, exitCodeOf: jsonExitCode };

const COMPLETE: TurboOutput = { stdout: '{}\n', stderr: 'warn\n' };

const INCOMPLETE: TurboOutput = { stdout: '{"tasks":[', stderr: 'warn\n' };

/** What execFile hands its callback for a child stopped by SIGTERM. */
const killError = (): ExecFileException => Object.assign(new Error('Command failed'), { signal: 'SIGTERM' as const });

/** What execFile hands its callback for a child that exited 1, as `taskkill /F` leaves it. */
const exitError = (code: number): ExecFileException => Object.assign(new Error('Command failed'), { code });

const settled = async (
  error: ExecFileException | null,
  output: TurboOutput,
  stalledCheck: ExitStallCheck | undefined
): Promise<TurboResult> => {
  const resolvers = Promise.withResolvers<TurboResult>();

  settleTurbo(resolvers, error, output, stalledCheck);

  return resolvers.promise;
};

describe('FEATURE: settling a turbo run', () => {
  describe('GIVEN no exit stall', () => {
    it('WHEN turbo exited 3 THEN it resolves with exit code 3', async () => {
      const expected: TurboResult = { ...COMPLETE, exitCode: 3 };

      await expect(settled(exitError(3), COMPLETE, undefined)).resolves.toStrictEqual(expected);
    });

    it('WHEN turbo was killed by a signal THEN it rejects with the error plus stderr', async () => {
      await expect(settled(killError(), COMPLETE, undefined)).rejects.toMatchObject({ signal: 'SIGTERM', stderr: 'warn\n' });
    });
  });

  describe('GIVEN an exit stall the guard stopped turbo for', () => {
    it('WHEN the whole stdout is complete THEN it resolves with the exit code the check reads', async () => {
      const expected: TurboResult = { ...COMPLETE, exitCode: 0 };

      await expect(settled(killError(), COMPLETE, JSON_CHECK)).resolves.toStrictEqual(expected);
    });

    it('WHEN taskkill left exit code 1 and the stdout is complete THEN the check, not the 1, gives the exit code', async () => {
      const expected: TurboResult = { ...COMPLETE, exitCode: 0 };

      await expect(settled(exitError(1), COMPLETE, JSON_CHECK)).resolves.toStrictEqual(expected);
    });

    it('WHEN the stdout is not complete THEN it rejects with the kill error plus stderr', async () => {
      await expect(settled(exitError(1), INCOMPLETE, JSON_CHECK)).rejects.toMatchObject({ code: 1, stderr: 'warn\n' });
    });

    it('WHEN turbo exited 0 by itself before the kill THEN it resolves with exit code 0', async () => {
      const expected: TurboResult = { ...INCOMPLETE, exitCode: 0 };

      await expect(settled(null, INCOMPLETE, JSON_CHECK)).resolves.toStrictEqual(expected);
    });
  });
});
