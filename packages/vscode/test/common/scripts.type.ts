/** What VS Code was asked to run for a script: the `ShellExecution`'s command, args and cwd, as the task event shows them. */
export type ShellFacts = {
  readonly command: string;
  readonly args: string[];
  readonly cwd: string | null;
};

/** The shell execution of the task named `taskId`, seen on its `onDidStartTask`; `facts` is `null` until it started. */
export type ShellWatch = {
  readonly facts: () => ShellFacts | null;
  readonly dispose: () => void;
};
