/**
 * Ascending, in default string order (UTF-16 code units), for `toSorted`; unlike `localeCompare` it does not change
 * with the host's locale. Pass the arguments swapped for descending.
 */
export const compareText = (left: string, right: string): number => Number(left > right) - Number(left < right);
