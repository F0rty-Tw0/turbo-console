/**
 * How one `tasks` key of a config treats its task: `excluded` is an entry of exactly `{ "extends": false }`, `fresh` is
 * `extends: false` beside other keys (inherits no field), `defined` is any other entry.
 */
export type TaskPresence = 'defined' | 'fresh' | 'excluded';

/**
 * A `turbo.json(c)` that parsed; `warning` is set when both files exist in its directory. `tasks` holds every `tasks`
 * key as its own key, `persistent` each key whose entry sets a boolean `persistent`, and `extends` the top-level
 * `extends` names (`//` for the root config, else package names).
 */
export type TurboConfigOk = {
  readonly path: string;
  readonly descriptions: Record<string, string>;
  readonly tasks: Record<string, TaskPresence>;
  readonly persistent: Record<string, boolean>;
  readonly extends: string[];
  readonly affectedUsingTaskInputs: boolean;
  readonly warning?: string | undefined;
};

/** A `turbo.json(c)` that did not parse; `error` names the first problem. */
export type TurboConfigError = {
  readonly path: string;
  readonly error: string;
};

/** What core resolves for one task turbo defines for a package; `persistent` is turbo's resolved value. */
export type TurboTaskFacts = {
  readonly persistent: boolean;
};

/**
 * The root config read once for every package: `qualifiedNames` are the package names a `<pkg>#<task>` key names, and
 * `bareTasks` the tasks its bare keys define for a package with no such key and no config of its own.
 */
export type RootTaskIndex = {
  readonly config: TurboConfigOk;
  readonly qualifiedNames: ReadonlySet<string>;
  readonly bareTasks: ReadonlyMap<string, TurboTaskFacts>;
};

/**
 * What the turbo task lookup reads: every config by its directory (`.` = root), error entries kept, graph packages by
 * the name an `extends` entry gives, and the root index; `root` is `null` when there is no parsed root config.
 */
export type TurboTaskLookup = {
  readonly configsByDir: Map<string, TurboConfigFile>;
  readonly packagesByName: Map<string, TurboTaskPackage>;
  readonly root: RootTaskIndex | null;
};

/** A graph package as the lookup reads it; `path` is relative to the workspace root, with either separator. */
export type TurboTaskPackage = {
  readonly name: string;
  readonly path: string;
};

/** The package a task map is resolved for: its `dir` (`.` = root) and its `extends` chain, own config first. */
export type TurboTaskTarget = {
  readonly name: string;
  readonly dir: string;
  readonly chain: TurboConfigOk[];
};

/** One config file read; `path` is the file's posix path relative to the workspace root (`turbo.json` = root). */
export type TurboConfigFile = TurboConfigError | TurboConfigOk;
