type SourceImport = {
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
