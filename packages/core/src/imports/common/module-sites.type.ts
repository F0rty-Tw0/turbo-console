import type { SourceImport } from './import-scan.type.ts';

/** `path` is posix, exact-case and relative to the package dir. */
type ModuleFileEnd = {
  readonly kind: 'file';
  readonly path: string;
};

/** `path` is posix, exact-case and relative to the package dir, with no trailing `/`. */
type ModuleDirEnd = {
  readonly kind: 'dir';
  readonly path: string;
};

/** `name` is the `WorkspaceTarget.name` of another workspace package. */
type ModuleStubEnd = {
  readonly kind: 'stub';
  readonly name: string;
};

/** One end of a sites query; restates the webview-ui bridge type, since core never imports webview-ui. */
export type ModuleEnd = ModuleFileEnd | ModuleDirEnd | ModuleStubEnd;

/** `to` null asks for every import into and out of `from`; a `to` asks for the imports behind the link `from` → `to`. */
export type ModuleSitesQuery = {
  readonly from: ModuleEnd;
  readonly to: ModuleEnd | null;
};

/** One import line: `file` is the importing walked file and `target` the walked file or stub it resolves to. */
export type ModuleSiteRow = {
  readonly file: string;
  readonly source: SourceImport;
  readonly target: ModuleFileEnd | ModuleStubEnd;
};

/** Both lists are sorted by `file` in code-unit order, then by `source.line`. */
export type ModuleSites = {
  readonly imports: ModuleSiteRow[];
  readonly importedBy: ModuleSiteRow[];
};
