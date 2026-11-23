import type { PackageImportScan, TsconfigPaths } from './import-scan.type.ts';

/** A workspace package an import can reach: `names` holds its name plus its manifest alias keys; `dir` is null for the root `//`. */
export type WorkspaceTarget = {
  readonly name: string;
  readonly names: string[];
  readonly dir: string | null;
};

export type ModuleBucket = 'unresolved' | 'external' | 'assets' | 'self';

/** `file` is posix, relative to the package dir, and a member of the walked files. */
type ModuleFileTarget = {
  readonly kind: 'file';
  readonly file: string;
};

/** `name` is the `WorkspaceTarget.name` of the package that owns the import. */
type ModuleStubTarget = {
  readonly kind: 'stub';
  readonly name: string;
};

type ModuleBucketTarget = {
  readonly kind: ModuleBucket;
};

export type ModuleTarget = ModuleFileTarget | ModuleStubTarget | ModuleBucketTarget;

/** `dir` is absolute with native separators; an empty `selfName` never matches. */
export type ModuleResolveContext = {
  readonly dir: string;
  readonly selfName: string;
  readonly walked: ReadonlySet<string>;
  readonly tsconfigPaths: TsconfigPaths | null;
  readonly others: WorkspaceTarget[];
};

/** One package's fold input: `dir` is absolute with native separators; `others` are the other workspace packages. */
export type ModuleGraphInput = {
  readonly dir: string;
  readonly selfName: string;
  readonly scan: PackageImportScan;
  readonly others: WorkspaceTarget[];
};

/** Imports from one file to one target, split into static value, type-only and lazy (`dynamic` or `require`) columns. */
export type ModuleLink = readonly [from: number, to: number, statics: number, types: number, lazies: number];

/** Imports per bucket that is not a node. */
export type ModuleCounts = {
  readonly unresolved: number;
  readonly external: number;
  readonly assets: number;
  readonly self: number;
};

/**
 * `files` are the walked files and `tests` the ascending indexes of the test files among them. A `fileLinks` `to`
 * indexes `files`; a `stubLinks` `to` indexes `stubs`, which are sorted by name. Both link lists are sorted by
 * (from, to) and hold no self-loop.
 */
export type ModuleGraph = {
  readonly files: string[];
  readonly tests: number[];
  readonly stubs: string[];
  readonly fileLinks: ModuleLink[];
  readonly stubLinks: ModuleLink[];
  readonly counts: ModuleCounts;
};
