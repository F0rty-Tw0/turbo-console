/** How a source file brings in a module: `import` / `export … from`, `import()`, or `require()`. */
export type ImportKind = 'static' | 'reexport' | 'dynamic' | 'require';

/** How an import names the target: its package name (or a manifest alias of it), a relative path into it, or a tsconfig `paths` alias. */
export type ImportVia = 'name' | 'relative' | 'alias';

/** Why a scan stopped before it finished: it listed too many files or directory entries, or ran out of time. */
export type ImportLimit = 'files' | 'entries' | 'time';

/** One import of the target in the dependent: `file` is posix, relative to the dependent's dir; `line` 0-based; `specifier` and `text` cut like a manifest entry. */
export type ImportSite = {
  readonly file: string;
  readonly line: number;
  readonly specifier: string;
  readonly text: string;
  readonly kind: ImportKind;
  readonly isType: boolean;
  readonly via: ImportVia;
};

type ImportsFound = {
  readonly kind: 'found';
  readonly scanned: number;
  readonly skipped: number;
  readonly total: number;
  readonly sites: ImportSite[];
  readonly limit: ImportLimit | null;
};

type ImportsNone = {
  readonly kind: 'none';
  readonly scanned: number;
  readonly skipped: number;
  readonly limit: ImportLimit | null;
};

type ImportsFailed = { readonly kind: 'failed' };

/** What the host found in the dependent's source files for one edge; `sites` holds 1 to `IMPORT_SITES_MAX`, `total` counts every matched site, also in files whose path was too long to send (spec D11, D13). */
export type EdgeImportsResult = ImportsFound | ImportsNone | ImportsFailed;

export type GraphEdgeImportsMessage = {
  readonly type: 'edgeImports';
  readonly source: string;
  readonly target: string;
  readonly result: EdgeImportsResult;
};
