/** One folder of the scanned package; the package root has path '' and name ''. */
export type ModuleDir = {
  /** Posix, relative to the package dir: 'src/lib'. */
  readonly path: string;
  /** Last segment: 'lib'. */
  readonly name: string;
  /** Child folders, by name in code unit order. */
  readonly dirs: ModuleDir[];
  /** Indexes into `ModuleTree.files` of the files directly inside, by basename in code unit order. */
  readonly files: number[];
  /** Every file under it, nested ones included. */
  readonly fileCount: number;
};

export type ModuleTree = {
  /** The input, unchanged (the payload's `files`). */
  readonly files: string[];
  readonly root: ModuleDir;
};

/** A folder while the tree is built: child folders keyed by name, file indexes in input order. */
export type ModuleDirDraft = {
  readonly path: string;
  readonly name: string;
  readonly dirs: Map<string, ModuleDirDraft>;
  readonly files: number[];
};
