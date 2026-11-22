import type { TsconfigPaths } from './import-scan.type.ts';

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
