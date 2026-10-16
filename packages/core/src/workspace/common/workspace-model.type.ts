export type TaskNodeKind = 'atom-aggregate' | 'atom-file' | 'atom-umbrella' | 'task';

/** Set for the three atom kinds: the Atomizer group, and whether the file task is live. */
export type TaskAtom = {
  readonly group: string;
  readonly isLive: boolean;
};

/** A visible task after rules 1–3 of spec §4.4, before dependencies are cut and descriptions joined. */
export type ClassifiedTask = {
  readonly id: string;
  readonly name: string;
  readonly command: string | null;
  readonly tags: string[];
  readonly rawDependencies: string[];
  readonly kind: TaskNodeKind;
  readonly atom: TaskAtom | null;
};

export type ClassifiedPackage = {
  readonly name: string;
  readonly path: string;
  readonly tags: string[];
  readonly tasks: ClassifiedTask[];
};

export type ClassifyResult = {
  readonly packages: ClassifiedPackage[];
  readonly warnings: string[];
};

/** `'task'` when the root config sets `futureFlags.affectedUsingTaskInputs: true`. */
export type AffectedMode = 'package' | 'task';

/**
 * A visible task; `dependencies` hold only visible task ids, sorted. `isTurboTask` is false for a package script no
 * turbo config defines for its package: `turbo query` lists it, but `turbo run` does not run it. `persistent` is turbo's
 * resolved value (a continuous task, run until stopped); `false` for no turbo task, or when the configs cannot tell.
 */
export type TaskNode = {
  readonly id: string;
  readonly name: string;
  readonly command: string | null;
  readonly description: string | null;
  readonly tags: string[];
  readonly dependencies: string[];
  readonly kind: TaskNodeKind;
  readonly atom: TaskAtom | null;
  readonly isTurboTask: boolean;
  readonly persistent: boolean;
};

/** A visible package; `path` is posix, relative to the workspace root. */
export type PackageNode = {
  readonly name: string;
  readonly path: string;
  readonly tags: string[];
  readonly tasks: TaskNode[];
};

/** A turbo package edge between two visible packages; `kind` is turbo's `kind.kind`, verbatim. */
export type PackageEdge = {
  readonly source: string;
  readonly target: string;
  readonly kind: string;
};

export type PackageManagerName = 'npm' | 'pnpm' | 'yarn' | 'bun';

/** The root lockfiles that name a package manager; the cache keys the same files. */
export type LockfileName = 'pnpm-lock.yaml' | 'bun.lock' | 'bun.lockb' | 'yarn.lock' | 'package-lock.json';

type FieldSource = { readonly kind: 'field' };

type LockfileSource = { readonly kind: 'lockfile'; readonly file: LockfileName };

type DefaultSource = { readonly kind: 'default' };

/** Where the package manager came from: the root `packageManager` field, a root lockfile, or the npm fallback. */
export type PackageManagerSource = FieldSource | LockfileSource | DefaultSource;

export type PackageManager = {
  readonly name: PackageManagerName;
  readonly source: PackageManagerSource;
};

/** Spec §4.4: everything sorted, so two builds from the same input are deep-equal. */
export type WorkspaceModel = {
  readonly root: string;
  readonly turboVersion: string;
  readonly packageManager: PackageManager;
  readonly affectedMode: AffectedMode;
  readonly packages: PackageNode[];
  readonly edges: PackageEdge[];
  readonly warnings: string[];
};

/** What `buildWorkspaceModel` takes besides the graph and the configs: facts of the load, not of the graph. */
export type ModelSource = {
  readonly turboVersion: string;
  readonly root: string;
  readonly packageManager: PackageManager;
};
