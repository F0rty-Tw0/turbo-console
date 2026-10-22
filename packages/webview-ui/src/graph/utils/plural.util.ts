/** The count and the word that fits it: `1 task`, `0 tasks`. */
export const pluralOf = (count: number, singular: string, plural: string): string => {
  const word = count === 1 ? singular : plural;

  return `${count} ${word}`;
};
