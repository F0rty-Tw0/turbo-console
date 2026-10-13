/** One task of a dry run: `hash` is `null` for a just-in-time hashed task, whose cache state is then `'deferred'`. */
export type DryRunState = {
  readonly id: string;
  readonly hash: string | null;
  readonly cache: 'HIT' | 'MISS' | 'deferred';
};

/**
 * `tasks`: bare task names or `pkg#task` ids, at least one. `packages`: names each passed as `--filter=<name>`. A model
 * id of a task the package only inherits through `extends` (atom file tasks) is not runnable as `pkg#task`: pass its
 * task name with the package in `packages`. A `pkg#task` id runs whatever `packages` holds: turbo does not filter it.
 */
export type DryRunRequest = {
  readonly tasks: string[];
  readonly packages?: string[] | undefined;
};

/** `signal`: the caller's abort. */
export type ReadDryRunOptions = {
  readonly signal?: AbortSignal | undefined;
};
