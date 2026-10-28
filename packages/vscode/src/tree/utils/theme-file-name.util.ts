import type { IconsState, TreeRow } from '../common/tree-row.type.ts';

/** The first config file name of the row that the file icon theme names, or `null` outside `theme` mode or when it names none. */
export const themeFileNameOf = (row: TreeRow, state: IconsState): string | null => {
  if (state.mode !== 'theme' || row.themeFiles === undefined) return null;

  const named = row.themeFiles.find((name) => state.fileNames.has(name));

  return named ?? null;
};
