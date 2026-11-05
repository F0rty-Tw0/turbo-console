export type QuotedEnd = {
  readonly end: number;
  readonly isClosed: boolean;
};

export type TemplateChunk = {
  readonly end: number;
  readonly opensSubstitution: boolean;
  readonly isClosed: boolean;
};
