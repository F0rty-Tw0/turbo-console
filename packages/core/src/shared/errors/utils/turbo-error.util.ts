import { z } from 'zod';

import { failedMessage, invalidOutputMessage, ioMessage, turboCommand, withStderrTail } from './turbo-message.util.ts';
import type { AbortOutcome } from '../common/turbo-error.type.ts';
import { TurboException } from '../common/turbo.exception.ts';

/** Has a `code` key; its fields are read through `stringField`, never trusted to be strings. */
const isErrno = (error: unknown): error is Error => error instanceof Error && 'code' in error;

/** An error's field (`code`, `path`, `syscall`, `signal`, `stderr`) when it is a string; anything else counts as missing. */
const stringField = (error: Error, name: string): string | undefined => {
  const value: unknown = Reflect.get(error, name);

  return typeof value === 'string' ? value : undefined;
};

/** `runTurbo`'s `AbortError`, or a bare `TimeoutError` that never reached it. */
const ABORT_NAMES = ['AbortError', 'TimeoutError'];

const isAbortError = (error: unknown): error is Error => error instanceof Error && ABORT_NAMES.includes(error.name);

const isTimeoutError = (error: unknown): boolean => error instanceof Error && error.name === 'TimeoutError';

/** A bare `TimeoutError` (`AbortSignal.timeout` + `throwIfAborted`) or an `AbortError` caused by one is a timeout. */
const abortOutcome = (error: Error): AbortOutcome => {
  const isTimeout = isTimeoutError(error) || isTimeoutError(error.cause);

  return isTimeout ? 'timeout' : 'aborted';
};

/** `runTurbo` attaches the stderr turbo wrote to its `AbortError` and to a rejection without an exit code; any other error has none. */
const attachedStderr = (error: Error): string => {
  const stderr = stringField(error, 'stderr');

  return stderr ?? '';
};

const MIB = 2 ** 20;

/**
 * The bound of the watchdog's `MemoryLimitError` when it is the abort's cause. Read by name and through `Reflect.get`,
 * since `errors/` never imports from `shared/turbo/data-access`.
 */
const memoryLimitOf = (cause: unknown): number | undefined => {
  if (!(cause instanceof Error) || cause.name !== 'MemoryLimitError') return undefined;

  const maxRssBytes: unknown = Reflect.get(cause, 'maxRssBytes');

  return typeof maxRssBytes === 'number' && Number.isFinite(maxRssBytes) ? maxRssBytes : undefined;
};

const fromAbort = (error: Error, command: string): TurboException => {
  const stderr = attachedStderr(error);
  const maxRssBytes = memoryLimitOf(error.cause);

  if (maxRssBytes !== undefined) {
    const head = `${turboCommand(command)} used too much memory (over ${Math.round(maxRssBytes / MIB)} MiB)`;

    return new TurboException('failed', withStderrTail(head, stderr), { cause: error });
  }

  const outcome = abortOutcome(error);
  const message = failedMessage(command, outcome, stderr);

  return new TurboException('failed', message, { cause: error });
};

/** execFile's code once stdout or stderr passes `maxBuffer`; the cap itself is not on the error. */
const MAX_BUFFER_CODE = 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';

/**
 * `turbo <command> failed: <signal ?? code>` (`printed too much output` past `maxBuffer`), then the attached stderr's
 * tail; never the error's message, which can embed all of stderr.
 */
const errnoFailedMessage = (command: string, error: Error): string => {
  const signal = stringField(error, 'signal');
  const code = stringField(error, 'code');
  const reason = signal ?? code;
  const turbo = turboCommand(command);
  const failed = `${turbo} failed`;
  const stderr = attachedStderr(error);

  if (code === MAX_BUFFER_CODE) return withStderrTail(`${turbo} printed too much output (over the output cap)`, stderr);

  if (reason === undefined) return withStderrTail(failed, stderr);

  return withStderrTail(`${failed}: ${reason}`, stderr);
};

/** A failed spawn is never `io`: the binary is not runnable, or the spawn failed for a reason named by its code. */
const fromSpawn = (error: Error, command: string): TurboException => {
  const code = stringField(error, 'code');
  const isNotRunnable = code === 'ENOENT' || code === 'EACCES' || code === 'ENOTDIR';

  if (!isNotRunnable) return new TurboException('failed', errnoFailedMessage(command, error), { cause: error });

  const path = stringField(error, 'path');
  const binary = path ?? 'turbo';

  return new TurboException('not-found', `turbo binary not runnable: ${ioMessage(binary, code)}`, { cause: error });
};

const fromErrno = (error: Error, command: string): TurboException => {
  const syscall = stringField(error, 'syscall');
  const isSpawn = syscall?.startsWith('spawn') === true;

  if (isSpawn) return fromSpawn(error, command);

  const path = stringField(error, 'path');
  const code = stringField(error, 'code');

  if (path !== undefined) return new TurboException('io', ioMessage(path, code), { cause: error });

  return new TurboException('failed', errnoFailedMessage(command, error), { cause: error });
};

/** Maps anything a spawn, read or parse threw onto one `TurboException`, keeping the original as `cause`. */
export const toTurboException = (error: unknown, command: string): TurboException => {
  if (error instanceof TurboException) return error;

  const isAbort = isAbortError(error);

  if (isAbort) return fromAbort(error, command);

  const isInvalidOutput = error instanceof SyntaxError || error instanceof z.ZodError;

  if (isInvalidOutput) return new TurboException('invalid-output', invalidOutputMessage(command, error), { cause: error });

  if (isErrno(error)) return fromErrno(error, command);

  return new TurboException('failed', `${turboCommand(command)} failed`, { cause: error });
};
