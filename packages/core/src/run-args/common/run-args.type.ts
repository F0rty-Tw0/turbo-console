export type RunAllOptions = {
  readonly affected: boolean;
};

/** The only `--continue` mode a run can ask for. */
export type ContinueMode = 'dependencies-successful';

/** What a run adds to the plain turbo run besides `force`; an absent field is off. */
export type RunExtras = {
  readonly only?: boolean;
  readonly continueMode?: ContinueMode;
  readonly concurrency?: string;
  readonly passThrough?: string[];
};

/** `force`: rerun the task even on a cache hit (`--force`). */
type ForceOption = {
  readonly force: boolean;
};

export type RunTaskOptions = ForceOption & RunExtras;
