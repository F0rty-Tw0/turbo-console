/** One `.turbo/runs/*.json` entry: its file name, last write time and size in bytes. */
export type RunSummaryFile = {
  readonly name: string;
  readonly mtimeMs: number;
  readonly size: number;
};
