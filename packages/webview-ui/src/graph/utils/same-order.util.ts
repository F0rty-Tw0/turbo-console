/** Both lists hold the same items in the same order. */
export const sameOrder = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) return false;

  const isSame = left.every((item, index) => item === right[index]);

  return isSame;
};
