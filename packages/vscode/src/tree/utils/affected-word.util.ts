import type { RowAffected } from '../common/row-affected.type.ts';

/** The description with the affected word behind it: `''` + word is the word; no affected mark, or a `null` word, leaves the description as it is. */
export const withAffectedWord = (description: string, affected: RowAffected | null): string => {
  const word = affected?.word ?? null;

  if (word === null) return description;

  const joined = `${description} · ${word}`;

  return description === '' ? word : joined;
};
