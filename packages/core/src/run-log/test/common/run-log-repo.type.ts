import type { ChildProcess } from 'node:child_process';

/** A temp git repo of the gate fixture and the turbo runs started in it. */
export type RunLogRepo = {
  readonly dir: string;
  /** Spawns turbo in `dir`, detached, with the log order streamed and `env` over the core turbo env. */
  readonly launch: (args: string[], env: Record<string, string>) => ChildProcess;
  /** Kills every run that is still going, then removes `dir`. */
  readonly dispose: () => Promise<void>;
};
