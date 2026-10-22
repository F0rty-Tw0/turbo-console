import type { KeyedPart } from '../common/details.type.ts';

const partOf = (text: string, index: number): KeyedPart => {
  const part: KeyedPart = { text, isKey: index % 2 === 1 };

  return part;
};

const hasText = (part: KeyedPart): boolean => part.text !== '';

/** Splits copy on backtick pairs: the text between a pair is a key; an unmatched backtick leaves the whole text plain. */
export const keyedPartsOf = (text: string): KeyedPart[] => {
  const pieces = text.split('`');
  const isUnmatched = pieces.length % 2 === 0;

  if (isUnmatched) return [partOf(text, 0)];

  const parts = pieces.map(partOf);

  return parts.filter(hasText);
};
