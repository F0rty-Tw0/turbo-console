/** What turbo resolved for a task from `turbo.json`: `inputs: []` means the task declares none. */
export type TaskDefinition = {
  readonly inputs: string[];
  readonly outputs: string[];
  readonly dependsOn: string[];
  readonly cache: boolean;
  readonly persistent: boolean;
  readonly env: string[];
};

/** One task of a dry run: `hash` is `null` for a just-in-time hashed task, whose cache state is then `'deferred'`. */
export type DryRunState = {
  readonly id: string;
  readonly hash: string | null;
  readonly cache: 'HIT' | 'MISS' | 'deferred';
  readonly definition: TaskDefinition;
};

/** `tasks`: bare task names (a `pkg#task` id is rejected), at least one. `packages`: names each passed as `--filter=<name>`. */
export type DryRunRequest = {
  readonly tasks: string[];
  readonly packages?: string[] | undefined;
};

/** `signal`: the caller's abort. */
export type ReadDryRunOptions = {
  readonly signal?: AbortSignal | undefined;
};
