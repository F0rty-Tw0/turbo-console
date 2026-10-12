import { z } from 'zod';

import { failedMessage, invalidOutputMessage, ioMessage, turboCommand, withStderrTail } from './turbo-message.util.ts';
import type { AbortOutcome } from '../common/turbo-error.type.ts';
import { TurboException } from '../common/turbo.exception.ts';

const isErrno = (error: unknown): error is NodeJS.ErrnoException => error instanceof Error && 'code' in error;

const abortOutcome = (error: Error): AbortOutcome => {
  const isTimeout = error.cause instanceof Error && error.cause.name === 'TimeoutError';

  return isTimeout ? 'timeout' : 'aborted';
};

/** `runTurbo` attaches the stderr turbo wrote to its `AbortError` and to a rejection without an exit code; any other error has none. */
const attachedStderr = (error: Error): string => {
  const stderr: unknown = Reflect.get(error, 'stderr');

  return typeof stderr === 'string' ? stderr : '';
};

const fromAbort = (error: Error, command: string): TurboException => {
  const outcome = abortOutcome(error);
  const stderr = attachedStderr(error);
  const message = failedMessage(command, outcome, stderr);

  return new TurboException('failed', message, { cause: error });
};

/** `turbo <command> failed: <signal ?? code>`, then the attached stderr's tail; never the error's message, which can embed all of stderr. */
const errnoFailedMessage = (command: string, error: NodeJS.ErrnoException): string => {
  const signal: unknown = Reflect.get(error, 'signal');
  const reason = typeof signal === 'string' ? signal : error.code;
  const failed = `${turboCommand(command)} failed`;
  const stderr = attachedStderr(error);

  if (typeof reason !== 'string') return withStderrTail(failed, stderr);

  return withStderrTail(`${failed}: ${reason}`, stderr);
};

/** A failed spawn is never `io`: the binary is not runnable, or the spawn failed for a reason named by its code. */
const fromSpawn = (error: NodeJS.ErrnoException, command: string): TurboException => {
  const code = String(error.code);
  const isNotRunnable = code === 'ENOENT' || code === 'EACCES' || code === 'ENOTDIR';

  if (!isNotRunnable) return new TurboException('failed', errnoFailedMessage(command, error), { cause: error });

  const binary = error.path ?? 'turbo';

  return new TurboException('not-found', `turbo binary not runnable: ${ioMessage(binary, code)}`, { cause: error });
};

const fromErrno = (error: NodeJS.ErrnoException, command: string): TurboException => {
  const isSpawn = error.syscall?.startsWith('spawn') === true;

  if (isSpawn) return fromSpawn(error, command);

  if (error.path !== undefined) return new TurboException('io', ioMessage(error.path, error.code), { cause: error });

  return new TurboException('failed', errnoFailedMessage(command, error), { cause: error });
};

/** Maps anything a spawn, read or parse threw onto one `TurboException`, keeping the original as `cause`. */
export const toTurboException = (error: unknown, command: string): TurboException => {
  if (error instanceof TurboException) return error;

  const isAbort = error instanceof Error && error.name === 'AbortError';

  if (isAbort) return fromAbort(error, command);

  const isInvalidOutput = error instanceof SyntaxError || error instanceof z.ZodError;

  if (isInvalidOutput) return new TurboException('invalid-output', invalidOutputMessage(command, error), { cause: error });

  if (isErrno(error)) return fromErrno(error, command);

  return new TurboException('failed', `${turboCommand(command)} failed`, { cause: error });
};
