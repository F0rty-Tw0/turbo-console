export type SourceImport = {
  readonly specifier: string;
  readonly kind: 'static' | 'reexport' | 'dynamic' | 'require';
  readonly isType: boolean;
  /** 0-based line of the form's first keyword (D13). */
  readonly line: number;
  /** That raw line, sliced to 1,000 characters; the host cuts it further (D13). */
  readonly text: string;
};

/** One matched form: `start` is the offset of its first keyword, `next` the token index to resume scanning from. */
export type ImportForm = {
  readonly specifier: string;
  readonly kind: SourceImport['kind'];
  readonly isType: boolean;
  readonly start: number;
  readonly next: number;
};

/** Why a scan stopped before it finished: the walk listed `files` or `entries` past their caps, or `timeMs` ran out. */
export type ImportScanLimit = 'files' | 'entries' | 'time';

export type ImportScanCaps = {
  /** Source files one scan lists. */
  readonly files: number;
  /** Directory entries one walk reads. */
  readonly entries: number;
  readonly timeMs: number;
  /** A larger source file is skipped, never read. */
  readonly fileBytes: number;
  /** Files read at once. */
  readonly reads: number;
};

/**
 * One file's last lex: the `lstat` it was read under, and what `importsOf` found. `imports` is the array every later
 * scan hands out for that file; never mutate it.
 */
export type CachedFile = {
  readonly mtimeMs: number;
  readonly size: number;
  readonly imports: SourceImport[];
};

/** What `ImportScanInput.cache` needs; `ImportFileCache` (data-access) fills it, since `common/` may not import that class. */
export type ImportFileStore = {
  /** The map the last finished scan of `dir` left; empty when none. */
  readonly filesOf: (dir: string) => ReadonlyMap<string, CachedFile>;
  /** Replaces `dir`'s map; clears every map first when the total would pass `IMPORT_CACHE_MAX`. */
  readonly swap: (dir: string, files: ReadonlyMap<string, CachedFile>) => void;
};

/** Effective tsconfig `paths` of A (D6): `baseUrl` is the absolute dir the targets resolve against. */
export type TsconfigPaths = {
  readonly baseUrl: string;
  readonly paths: Readonly<Record<string, string[]>>;
};

/**
 * `file` is posix, relative to `dir`; only files with at least one import are listed, in walk order. `imports` is the
 * cache's own array (`CachedFile.imports`); never mutate it.
 */
export type ScannedFile = {
  readonly file: string;
  readonly imports: SourceImport[];
};

export type PackageImportScan = {
  readonly files: ScannedFile[];
  /** `null` before U8g, and when A has no tsconfig or no `paths`. */
  readonly tsconfigPaths: TsconfigPaths | null;
  readonly scanned: number;
  readonly skipped: number;
  readonly limit: ImportScanLimit | null;
};
