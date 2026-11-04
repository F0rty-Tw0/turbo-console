import type { RunLogRead } from '../../common/run-log-tail.type.ts';

/** One `read` call: where it started and how many bytes it returned (`0` for a missing file). */
export type RunLogReadRecord = {
  readonly from: number;
  readonly length: number;
};

/**
 * An in-memory log folder. `hold` makes every later `read` wait until the returned release is called; `append` does
 * turbo's rewrite: the last `]\n` becomes `,\n` + line + `\n]\n`, or the first line goes over `[\n]\n`.
 */
export type FakeLogFs = {
  readonly read: RunLogRead;
  readonly files: Map<string, Uint8Array>;
  readonly reads: RunLogReadRecord[];
  readonly write: (path: string, lines: string[]) => void;
  readonly append: (path: string, line: string) => void;
  readonly hold: () => () => void;
};
