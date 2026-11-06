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
