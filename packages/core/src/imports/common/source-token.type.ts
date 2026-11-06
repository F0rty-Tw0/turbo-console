type SourceTokenKind = 'word' | 'string' | 'template' | 'complex' | 'broken' | 'punct';

/**
 * `value` is the word, the raw text between the quotes or backticks of a closed `string` / no-substitution
 * `template`, the punctuator, or `''` for `complex` and `broken`. `start` is the offset of its first char.
 */
export type SourceToken = {
  readonly kind: SourceTokenKind;
  readonly value: string;
  readonly start: number;
};

export type QuotedEnd = {
  readonly end: number;
  readonly isClosed: boolean;
};

export type TemplateChunk = {
  readonly end: number;
  readonly opensSubstitution: boolean;
  readonly isClosed: boolean;
};
