/**
 * `next` is the index of the first token after the clause; `hasBinding` is true for a default or `* as n` binding.
 */
export type ImportClause = {
  readonly next: number;
  readonly hasBinding: boolean;
  readonly typeItems: number;
  readonly items: number;
};
