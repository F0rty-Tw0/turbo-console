export type RunAllOptions = {
  readonly affected: boolean;
};

/** `force`: rerun the task even on a cache hit (`--force`). */
export type RunTaskOptions = {
  readonly force: boolean;
};
