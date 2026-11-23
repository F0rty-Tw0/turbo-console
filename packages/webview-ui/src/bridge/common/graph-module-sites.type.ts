import type { ImportKind, ImportLimit } from './graph-imports.type.ts';

type ModuleFileEnd = { readonly kind: 'file'; readonly path: string };

type ModuleDirEnd = { readonly kind: 'dir'; readonly path: string };

type ModuleStubEnd = { readonly kind: 'stub'; readonly name: string };

/** A drawn end: a file or folder by posix path relative to the package dir (a folder never ''), or another workspace package. */
export type ModuleEnd = ModuleFileEnd | ModuleDirEnd | ModuleStubEnd;

/** One import line: `file` imports, `target` is what it resolves to (a file or a stub, never a dir); `line` is 0-based. */
export type ModuleSite = {
  readonly file: string;
  readonly line: number;
  readonly text: string;
  readonly kind: ImportKind;
  readonly isType: boolean;
  readonly target: ModuleFileEnd | ModuleStubEnd;
};

/**
 * The import sites for a query `(from, to)`. A path is "in" an end when it equals the end's path (file), starts with its path plus
 * `/` (dir), or resolves to the stub of its name (stub). With `to` set (a link), `imports` holds the sites in files in `from` whose
 * target is in `to`, and `importedBy` is empty. With `to` null and `from` a file or dir, `imports` holds the sites in files in `from`
 * whose target is not in `from`, and `importedBy` the sites in files not in `from` whose target is in `from`. With `to` null and
 * `from` a stub, `imports` is empty and `importedBy` holds the sites whose target is that stub. Each list is sorted by `file` (code
 * unit), then `line`, and holds at most `IMPORT_SITES_MAX` sites; each `*Total` counts every match, the unsent ones too.
 */
export type ModuleSitesFound = {
  readonly kind: 'found';
  readonly imports: ModuleSite[];
  readonly importsTotal: number;
  readonly importedBy: ModuleSite[];
  readonly importedByTotal: number;
  readonly limit: ImportLimit | null;
};

type ModuleSitesFailed = { readonly kind: 'failed' };

/** What the host found when it looked up the import sites behind one drawn end or link. */
export type ModuleSitesResult = ModuleSitesFound | ModuleSitesFailed;

/** The page asking the host for the import sites behind one end (`to` null) or one link. */
export type GraphScanModuleSitesMessage = {
  readonly type: 'scanModuleSites';
  readonly packageName: string;
  readonly from: ModuleEnd;
  readonly to: ModuleEnd | null;
};

/** The host's answer to a `scanModuleSites` ask. */
export type GraphModuleSitesMessage = {
  readonly type: 'moduleSites';
  readonly packageName: string;
  readonly from: ModuleEnd;
  readonly to: ModuleEnd | null;
  readonly result: ModuleSitesResult;
};
