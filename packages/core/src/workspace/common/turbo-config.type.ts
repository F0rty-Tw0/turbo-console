/** How one `tasks` key of a config treats its task: `excluded` is an entry of exactly `{ "extends": false }`. */
export type TaskPresence = 'defined' | 'excluded';

/**
 * A `turbo.json(c)` that parsed; `warning` is set when both files exist in its directory. `tasks` holds every `tasks`
 * key as its own key, and `extends` the top-level `extends` names (`//` for the root config, else package names).
 */
export type TurboConfigOk = {
  readonly path: string;
  readonly descriptions: Record<string, string>;
  readonly tasks: Record<string, TaskPresence>;
  readonly extends: string[];
  readonly affectedUsingTaskInputs: boolean;
  readonly warning?: string | undefined;
};

/** A `turbo.json(c)` that did not parse; `error` names the first problem. */
export type TurboConfigError = {
  readonly path: string;
  readonly error: string;
};

/** What the turbo task lookup reads: every config by its directory (`.` = root), error entries kept, and package dirs by name. */
export type TurboTaskLookup = {
  readonly configsByDir: Map<string, TurboConfigFile>;
  readonly dirsByName: Map<string, string>;
};

/** A graph package as the lookup reads it; `path` is relative to the workspace root, with either separator. */
export type TurboTaskPackage = {
  readonly name: string;
  readonly path: string;
};

/** One config file read; `path` is the file's posix path relative to the workspace root (`turbo.json` = root). */
export type TurboConfigFile = TurboConfigError | TurboConfigOk;
