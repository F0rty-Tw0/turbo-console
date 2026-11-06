export type SourceImport = {
  readonly specifier: string;
  readonly kind: 'static' | 'reexport' | 'dynamic' | 'require';
  readonly isType: boolean;
  /** 0-based line of the form's first keyword (D13). */
  readonly line: number;
  /** That raw line, sliced to 1,000 characters; the host cuts it further (D13). */
  readonly text: string;
};
