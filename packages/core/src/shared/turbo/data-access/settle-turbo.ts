import type { ExecFileException } from 'node:child_process';

import type { ExitStallCheck, TurboOutput, TurboResult } from '../common/turbo.type.ts';

/** M0's mapping: an exit code, non-zero included, resolves; none (spawn failure, a signal, maxBuffer) rejects, with `stderr`. */
const settleExited = (resolvers: PromiseWithResolvers<TurboResult>, error: ExecFileException | null, output: TurboOutput): void => {
  if (error !== null) Object.assign(error, { stderr: output.stderr });
  const exitCode = error === null ? 0 : error.code;

  if (typeof exitCode !== 'number') {
    resolvers.reject(error);

    return;
  }

  const result: TurboResult = { ...output, exitCode };

  resolvers.resolve(result);
};

/**
 * A stalled turbo the exit-stall guard stopped: the exit code `exitCodeOf` reads from its whole stdout resolves; output
 * that is not complete rejects with execFile's kill error plus `stderr`, as any killed turbo does.
 */
const settleStalled = (
  resolvers: PromiseWithResolvers<TurboResult>,
  error: ExecFileException,
  output: TurboOutput,
  exitCodeOf: ExitStallCheck['exitCodeOf']
): void => {
  const exitCode = exitCodeOf(output.stdout);

  if (exitCode === null) {
    resolvers.reject(Object.assign(error, { stderr: output.stderr }));

    return;
  }

  const result: TurboResult = { ...output, exitCode };

  resolvers.resolve(result);
};

/**
 * Settles `runTurbo`'s promise from execFile's callback. `stalledCheck` is the check of an exit stall the guard stopped
 * turbo for (see `watchExitStall`); a turbo that exited 0 by itself before that kill keeps M0's mapping.
 */
export const settleTurbo = (
  resolvers: PromiseWithResolvers<TurboResult>,
  error: ExecFileException | null,
  output: TurboOutput,
  stalledCheck: ExitStallCheck | undefined
): void => {
  if (stalledCheck === undefined || error === null) {
    settleExited(resolvers, error, output);

    return;
  }

  settleStalled(resolvers, error, output, stalledCheck.exitCodeOf);
};
