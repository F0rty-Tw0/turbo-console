import { execFile } from 'node:child_process';
import type { ExecFileException } from 'node:child_process';
import { createRequire } from 'node:module';

import type { TurboResult } from '../common/turbo.type.ts';
import { turboEnv } from '../utils/turbo-env.util.ts';

/** `stretch-300` `packageGraph` stdout alone is ~10 MB, far past execFile's 1 MB default. */
const MAX_BUFFER = 256 * 1024 * 1024;

/** Verify-first V2: pins this binary instead of a repo-local turbo, and drops the "no local turbo" warning. */
const SKIP_INFER = '--skip-infer';

/**
 * A hung turbo would otherwise block its caller forever. Applied as an abort signal, not execFile's `timeout`: turbo
 * exits 0 on the SIGTERM that `timeout` sends, so a timed-out run would resolve as a success.
 */
const TIMEOUT_MS = 60_000;

/**
 * Runs the turbo binary this package resolves (`node <turbo/bin/turbo> --skip-infer ...args`) in `cwd`, with no shell,
 * under the hardened env from `turboEnv`: no inherited `GIT_*` or turbo credential variables, local cache only, no
 * request to a remote cache, git fsmonitor off. The target repo's `.git/config` is otherwise trusted. Resolves with
 * turbo's exit code, non-zero included; rejects only when no exit code exists (spawn failure, a kill signal, the
 * `timeoutMs` abort, 60 s by default, or output past the 256 MB buffer).
 */
export const runTurbo = async (args: string[], cwd: string, timeoutMs = TIMEOUT_MS): Promise<TurboResult> => {
  const { promise, resolve, reject } = Promise.withResolvers<TurboResult>();
  const turboBin = createRequire(import.meta.url).resolve('turbo/bin/turbo');
  const env = turboEnv(process.env);
  const signal = AbortSignal.timeout(timeoutMs);
  const options = { cwd, env, maxBuffer: MAX_BUFFER, signal, windowsHide: true };

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
