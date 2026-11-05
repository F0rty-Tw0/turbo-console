import type { RunLogPorts, RunLogRead } from '../../common/run-log-tail.type.ts';

/** One `read` call: where it started and how many bytes it returned (`0` for a missing file). */
export type RunLogReadRecord = {
  readonly from: number;
  readonly length: number;
};

/** One directory watcher the fake handed out; `closed` flips when the code under test closes it. */
export type FakeWatcherRecord = {
  readonly dir: string;
  // eslint-disable-next-line local/readonly-type-properties -- set in place when the code under test closes the watcher
  closed: boolean;
  readonly onChange: (fileName: string | null) => void;
  readonly onError: (error: unknown) => void;
};

/**
 * An in-memory log folder. `hold` makes every later `read` wait until the returned release is called; `append` does
 * turbo's rewrite: the last `]\n` becomes `,\n` + line + `\n]\n`, or the first line goes over `[\n]\n`. `emit` and `fail`
 * call the open watchers of a folder; `failNextWatch` makes the next `watch` call report its error before it returns;
 * `removed` and `logs` record what `ports` was asked; `mtimes` is what `modifiedAt` answers; `madeDirs` records each
 * `makeDir` call, and `failMakeDir` makes every later one reject with the error.
 */
export type FakeLogFs = {
  readonly read: RunLogRead;
  readonly files: Map<string, Uint8Array>;
  readonly reads: RunLogReadRecord[];
  readonly write: (path: string, lines: string[]) => void;
  readonly append: (path: string, line: string) => void;
  readonly hold: () => () => void;
  readonly watchers: FakeWatcherRecord[];
  readonly emit: (dir: string, fileName: string | null) => void;
  readonly fail: (dir: string, error: unknown) => void;
  readonly failNextWatch: (error: unknown) => void;
  readonly removed: string[];
  readonly logs: string[];
  readonly mtimes: Map<string, number>;
  readonly madeDirs: string[];
  readonly failMakeDir: (error: unknown) => void;
  readonly nowMs: number;
  readonly ports: RunLogPorts;
};

/** The watcher side of the fake: every watcher it handed out, and the ways to call the open ones of a folder. */
export type FakeWatchers = {
  readonly watchers: FakeWatcherRecord[];
  readonly watch: RunLogPorts['watch'];
  readonly emit: (dir: string, fileName: string | null) => void;
  readonly fail: (dir: string, error: unknown) => void;
  readonly failNextWatch: (error: unknown) => void;
};

/**
 * The folder calls of the fake: `remove` deletes from `files` and records the path in `removed`, `log` records in
 * `logs`, `modifiedAt` answers from `mtimes`, `makeDir` records in `madeDirs` and rejects after `failMakeDir`.
 */
export type FolderCalls = {
  readonly removed: string[];
  readonly logs: string[];
  readonly mtimes: Map<string, number>;
  readonly madeDirs: string[];
  readonly failMakeDir: (error: unknown) => void;
  readonly log: RunLogPorts['log'];
  readonly remove: RunLogPorts['remove'];
  readonly list: RunLogPorts['list'];
  readonly modifiedAt: RunLogPorts['modifiedAt'];
  readonly makeDir: RunLogPorts['makeDir'];
};
