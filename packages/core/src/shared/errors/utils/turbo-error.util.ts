import { z } from 'zod';

import { stderrTail } from './stderr-tail.util.ts';
import type { TurboVersionRange } from '../../turbo/common/turbo.type.ts';
import { TurboException } from '../common/turbo.exception.ts';

type AbortOutcome = 'timeout' | 'aborted';

const STDERR_LINES = 20;

const MAX_ISSUE_PATHS = 10;

const OUTCOME_TEXT: Record<AbortOutcome, string> = { timeout: 'timed out', aborted: 'was aborted' };

/** `turbo <command> exited <n>` / `timed out` / `was aborted`, then the last 20 lines of stderr when there are any. */
export const failedMessage = (command: string, outcome: number | AbortOutcome, stderr: string): string => {
  const what = typeof outcome === 'number' ? `exited ${outcome}` : OUTCOME_TEXT[outcome];
  const head = `turbo ${command} ${what}`;
  const tail = stderrTail(stderr, STDERR_LINES);

  if (tail === '') return head;

  return `${head}\n${tail}`;
};

const issuePath = (issue: z.core.$ZodIssue): string => {
  if (issue.path.length === 0) return '(root)';

  return issue.path.join('.');
};

/** Names where turbo's output broke its schema (at most 10 issue paths), never the output itself. */
export const invalidOutputMessage = (command: string, error: unknown): string => {
  if (!(error instanceof z.ZodError)) return `turbo ${command} printed non-JSON output`;

  const issues = error.issues.slice(0, MAX_ISSUE_PATHS);
  const paths = issues.map(issuePath);

  return `turbo ${command} output failed its schema at ${paths.join(', ')}`;
};

/** `code` is `ErrnoException.code` as is: a missing one reads `EIO`. */
export const ioMessage = (path: string, code = 'EIO'): string => `${path}: ${code}`;

export const versionUnsupportedMessage = (version: string, range: TurboVersionRange): string => {
  return `turbo ${version} is not supported; need >=${range.min} <${range.maxExclusive}`;
};

const isErrno = (error: unknown): error is NodeJS.ErrnoException => error instanceof Error && 'code' in error;

const abortOutcome = (error: Error): AbortOutcome => {
  const isTimeout = error.cause instanceof Error && error.cause.name === 'TimeoutError';

  return isTimeout ? 'timeout' : 'aborted';
};

/** `runTurbo` attaches the stderr turbo wrote before the abort; any other `AbortError` has none. */
const abortStderr = (error: Error): string => {
  const stderr: unknown = Reflect.get(error, 'stderr');

  return typeof stderr === 'string' ? stderr : '';
};

const fromAbort = (error: Error, command: string): TurboException => {
  const outcome = abortOutcome(error);
  const stderr = abortStderr(error);
  const message = failedMessage(command, outcome, stderr);

  return new TurboException('failed', message, { cause: error });
};

/** `turbo <command> failed: <signal ?? code>`; never the error's message, which can embed all of stderr. */
const errnoFailedMessage = (command: string, error: NodeJS.ErrnoException): string => {
  const signal: unknown = Reflect.get(error, 'signal');
  const reason = typeof signal === 'string' ? signal : error.code;

  if (typeof reason !== 'string') return `turbo ${command} failed`;

  return `turbo ${command} failed: ${reason}`;
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

  if (isErrno(error)) return fromErrno(error, command);

  return new TurboException('failed', `turbo ${command} failed`, { cause: error });
};
