/** One matched form: `start` is the offset of its first keyword, `next` the token index to resume scanning from. */
export type ImportForm = {
  readonly specifier: string;
  readonly kind: 'static' | 'reexport' | 'dynamic' | 'require';
  readonly isType: boolean;
  readonly start: number;
  readonly next: number;
};
