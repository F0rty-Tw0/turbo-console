import { z } from 'zod';

import { plainLine } from './plain-text.util.ts';
import { stderrTail } from './stderr-tail.util.ts';
import type { TurboVersionRange } from '../../turbo/common/turbo.type.ts';
import type { AbortOutcome } from '../common/turbo-error.type.ts';

const STDERR_LINES = 20;

const MAX_ISSUE_PATHS = 10;

/** Record keys and commands can carry repo text: one cannot flood the message. Counted before cleaning, so cleaning is bounded too. */
const MAX_TEXT_LENGTH = 200;

/** The end of a path is the informative part, so a long one keeps its last 1024 characters. */
const MAX_PATH_LENGTH = 1024;

const OUTCOME_TEXT: Record<AbortOutcome, string> = { timeout: 'timed out', aborted: 'was aborted' };

/** `turbo <command>`, the command cut to 200 characters and made plain. */
export const turboCommand = (command: string): string => {
  const head = command.slice(0, MAX_TEXT_LENGTH);

  return `turbo ${plainLine(head)}`;
};

/** `turbo <command> exited <n>` / `timed out` / `was aborted`, then the last 20 lines of stderr when there are any. */
export const failedMessage = (command: string, outcome: number | AbortOutcome, stderr: string): string => {
  const what = typeof outcome === 'number' ? `exited ${outcome}` : OUTCOME_TEXT[outcome];
  const head = `${turboCommand(command)} ${what}`;
  const tail = stderrTail(stderr, STDERR_LINES);

  if (tail === '') return head;

  return `${head}\n${tail}`;
};

const pathSegment = (key: PropertyKey): string => {
  const head = String(key).slice(0, MAX_TEXT_LENGTH);

  return plainLine(head);
};

const issuePath = (issue: z.core.$ZodIssue): string => {
  if (issue.path.length === 0) return '(root)';

  const segments = issue.path.map(pathSegment);

  return segments.join('.');
};

/**
 * `printed non-JSON output` for a `SyntaxError`; for a `ZodError`, where the output broke its schema (at most 10 issue
 * paths, each cut to 200 characters and made plain), never the output itself; `could not be read` otherwise.
 */
export const invalidOutputMessage = (command: string, error: unknown): string => {
  const turbo = turboCommand(command);

  if (error instanceof SyntaxError) return `${turbo} printed non-JSON output`;

  if (!(error instanceof z.ZodError)) return `${turbo} output could not be read`;

  const issues = error.issues.slice(0, MAX_ISSUE_PATHS);
  const paths = issues.map(issuePath);

  return `${turbo} output failed its schema at ${paths.join(', ')}`;
};

/** `<path>: <code>` on one plain line, the path cut to its last 1024 characters; a missing `code` reads `EIO`. */
export const ioMessage = (path: string, code = 'EIO'): string => {
  const pathEnd = path.slice(-MAX_PATH_LENGTH);

  return `${plainLine(pathEnd)}: ${plainLine(code)}`;
};

export const versionUnsupportedMessage = (version: string, range: TurboVersionRange): string => {
  return `turbo ${version} is not supported; need >=${range.min} <${range.maxExclusive}`;
};
