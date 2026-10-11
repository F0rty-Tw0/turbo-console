import { execFile } from 'node:child_process';
import type { ExecFileException } from 'node:child_process';
import { createRequire } from 'node:module';

import type { TurboResult } from '../common/turbo.type.ts';

/** `stretch-300` `packageGraph` stdout alone is ~10 MB, far past execFile's 1 MB default. */
const MAX_BUFFER = 256 * 1024 * 1024;

/** Verify-first V2: pins this binary instead of a repo-local turbo, and drops the "no local turbo" warning. */
const SKIP_INFER = '--skip-infer';

/**
 * Runs the turbo binary this package resolves (`node <turbo/bin/turbo> --skip-infer ...args`) in `cwd`, with no shell.
 * Resolves with turbo's exit code, non-zero included; rejects only when no exit code exists (spawn failure, a kill
 * signal, or output past the 256 MB buffer).
 */
export const runTurbo = async (args: string[], cwd: string): Promise<TurboResult> => {
  const { promise, resolve, reject } = Promise.withResolvers<TurboResult>();
  const turboBin = createRequire(import.meta.url).resolve('turbo/bin/turbo');
  const options = { cwd, maxBuffer: MAX_BUFFER, windowsHide: true };

  const onExit = (error: ExecFileException | null, stdout: string, stderr: string): void => {
    const exitCode = error === null ? 0 : error.code;

    if (typeof exitCode !== 'number') {
      reject(error);

      return;
    }

    const result: TurboResult = { stdout, stderr, exitCode };

    resolve(result);
  };

  execFile(process.execPath, [turboBin, SKIP_INFER, ...args], options, onExit);

  return promise;
};
