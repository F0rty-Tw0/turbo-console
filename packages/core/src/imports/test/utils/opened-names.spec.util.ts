/** Each of `opened` (absolute paths under `dir`) as a path relative to `dir`. */
export const openedNamesOf = (opened: string[], dir: string): string[] => opened.map((path) => path.slice(dir.length + 1));
