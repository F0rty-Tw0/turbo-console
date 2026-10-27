/** A zero-based line and character of a text, as the editor counts them. */
export type TextPosition = {
  readonly line: number;
  readonly character: number;
};
