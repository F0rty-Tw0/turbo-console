/** The description with the affected word behind it: `''` + word is the word, a `null` word leaves the description as it is. */
export const withAffectedWord = (description: string, word: string | null): string => {
  if (word === null) return description;

  const joined = `${description} · ${word}`;

  return description === '' ? word : joined;
};
