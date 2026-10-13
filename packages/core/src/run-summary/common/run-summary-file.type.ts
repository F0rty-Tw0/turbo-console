/** One `.turbo/runs/*.json` entry: its file name and last write time. */
export type RunSummaryFile = {
  readonly name: string;
  readonly mtimeMs: number;
};
