import type { RunLogEntry } from '@turbo-console/core';

/**
 * Where the next read of one log file starts: the file offset of the scan's `next`. Turbo rewrites the closing `]` in
 * place, so the tail re-reads from there. `skipping` while inside a broken line; `leadingInvalid` is the D4 probe's count
 * of invalid objects before the first valid entry (`hasEntry`).
 */
export type RunLogCursor = {
  readonly offset: number;
  readonly skipping: boolean;
  readonly leadingInvalid: number;
  readonly hasEntry: boolean;
};

/** One read window stepped: the cursor for the next read, the entries it held, and whether the file proved an unknown format. */
export type RunLogStep = {
  readonly cursor: RunLogCursor;
  readonly entries: RunLogEntry[];
  readonly isUnknown: boolean;
};
