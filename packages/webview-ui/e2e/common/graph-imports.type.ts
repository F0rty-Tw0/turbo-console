import type { EdgeImportsResult } from '../../src/bridge/common/graph-imports.type.ts';

type FoundKind = { readonly kind: 'found' };

/** The host's answer when it found imports. */
export type FoundImportsResult = Extract<EdgeImportsResult, FoundKind>;

/** One import row as the block shows it: the 1-based line, the trimmed text and the tags in order. */
export type ImportRowFacts = {
  readonly number: number;
  readonly text: string;
  readonly tags: string[];
};

export type ImportGroupFacts = {
  readonly file: string;
  readonly rows: ImportRowFacts[];
};
