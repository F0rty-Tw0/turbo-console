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

/** Up to `max` bytes of the file at `path` from `from`; `null` while the file does not exist or is briefly unreadable (`RUN_LOG_RETRYABLE_READ_CODES`). */
export type RunLogRead = (path: string, from: number, max: number) => Promise<Uint8Array | null>;

/** A directory watcher that can be closed; closing it twice is harmless. */
export type RunLogWatcher = {
  readonly close: () => void;
};

/**
 * What the tails need from the machine. `watch` reports a changed file name, or `null` when the OS gave none; it never
 * throws and reports a failure through `onError`, possibly before it returns; `read` and `list` never invent a file;
 * `modifiedAt` is `null` for a file that is gone; `makeDir` makes `dir` and its parents and rejects when it cannot;
 * `log` takes one Output line.
 */
export type RunLogPorts = {
  readonly watch: (dir: string, onChange: (fileName: string | null) => void, onError: (error: unknown) => void) => RunLogWatcher;
  readonly read: RunLogRead;
  readonly remove: (path: string) => Promise<void>;
  readonly list: (dir: string) => Promise<string[]>;
  readonly modifiedAt: (path: string) => Promise<number | null>;
  readonly makeDir: (dir: string) => Promise<void>;
  readonly now: () => number;
  readonly log: (line: string) => void;
};

/**
 * One run's log path: `env` is repo-relative with `/`, the form turbo's `TURBO_LOG_FILE` was proven with (U7a contract,
 * three OSes); `file` is absolute, for the tail.
 */
export type RunLogPath = {
  readonly env: string;
  readonly file: string;
};

/**
 * Spec D8's tail handle: `drain` at the process end reads to the end of the file, `close` on a start failure reads no
 * more. Both remove the file and release the root's watcher; neither rejects.
 */
export type RunLogTail = {
  readonly drain: () => Promise<void>;
  readonly close: () => void;
};

/** What a run needs of the window's tails (spec D6, D10): the folder made before it starts, and its file tailed. */
export type RunLogs = {
  readonly prepare: (root: string) => Promise<boolean>;
  readonly start: (root: string, path: string, onEvent: RunLogListener) => RunLogTail;
};
