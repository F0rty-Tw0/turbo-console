import type { RunLogEntry, RunLogEvent } from '@turbo-console/core';

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

/**
 * How a drained file ended: read to its end, stopped as an unknown format (D4), never written (D6), or `failed`: a read
 * rejected or the listener threw, and the tail ended there.
 */
export type RunLogOutcome = 'read' | 'unknown' | 'missing' | 'failed';

/** Synchronous: a returned promise is not awaited and its rejection is not contained; only a throw ends the tail. */
export type RunLogListener = (event: RunLogEvent) => void;

/** Up to `max` bytes of the file at `path` from `from`; `null` while the file does not exist. */
export type RunLogRead = (path: string, from: number, max: number) => Promise<Uint8Array | null>;
