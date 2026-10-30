import type { TurboConfigOk, TurboTaskLookup } from './turbo-config.type.ts';

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
  /** Every dropped phantom (a `task` with no command) by id, with its raw dependencies; carriers and hidden packages excluded. */
  readonly phantoms: ReadonlyMap<string, string[]>;
  readonly warnings: string[];
};

/** `'task'` when the root config sets `futureFlags.affectedUsingTaskInputs: true`. */
export type AffectedMode = 'package' | 'task';

/**
 * A visible task; `dependencies` hold only visible task ids, sorted. `isTurboTask` is false for a package script no
 * turbo config defines for its package: `turbo query` lists it, but `turbo run` does not run it (a single-package turbo
 * runs it uncached, yet it stays a script). `persistent` is turbo's resolved value (a continuous task, run until stopped); `false` for no turbo task, or when the configs cannot tell.
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

/**
 * A visible package; `path` is posix, relative to the workspace root. `label` is what a view shows instead of `name`:
 * the root `package.json` name of a single-package repo's `//` package, `null` for every other package.
 */
export type PackageNode = {
  readonly name: string;
  readonly path: string;
  readonly label: string | null;
  readonly tags: string[];
  readonly tasks: TaskNode[];
};

/** What every package node reads besides its own package. */
export type PackageContext = {
  readonly visibleIds: Set<string>;
  readonly configs: Map<string, TurboConfigOk>;
  readonly lookup: TurboTaskLookup;
  readonly rootLabel: string | null;
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

type DevEnginesSource = { readonly kind: 'devEngines' };

type LockfileSource = { readonly kind: 'lockfile'; readonly file: LockfileName };

type DefaultSource = { readonly kind: 'default' };

/**
 * Where the package manager came from: the root `packageManager` field, the root `devEngines.packageManager`, a root
 * lockfile, or the npm fallback, in that order.
 */
export type PackageManagerSource = FieldSource | DevEnginesSource | LockfileSource | DefaultSource;

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
  /** `true` when the `//` package is the only package (spec §1): a repo with no declared workspaces. */
  readonly singlePackage: boolean;
  readonly packages: PackageNode[];
  /**
   * The monorepo root `//` with only its `//#<name>` turbo tasks; `null` for a single-package repo (`//` is then
   * `packages[0]`) or a graph with no root. Kept apart from `packages`, which feeds the tree and the run picker.
   */
  readonly rootPackage: PackageNode | null;
  readonly edges: PackageEdge[];
  readonly warnings: string[];
};

/** What `buildWorkspaceModel` takes besides the graph and the configs: facts of the load, not of the graph. */
export type ModelSource = {
  readonly turboVersion: string;
  readonly root: string;
  readonly packageManager: PackageManager;
  readonly singlePackage: boolean;
  /** The label of the `//` package; `null` unless `singlePackage`. */
  readonly rootLabel: string | null;
};
