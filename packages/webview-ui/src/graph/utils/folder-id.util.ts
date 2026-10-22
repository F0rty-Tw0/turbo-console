import { FOLDER_ID_PREFIX } from '../common/graph.const.ts';

const LAST_RESERVED_CODE_UNIT = 3;

/** The folder box id: the prefix plus the folder key, so no folder id equals a package name or an edge id. */
export const folderIdOf = (folder: string): string => `${FOLDER_ID_PREFIX}${folder}`;

/** False for the ids this feature owns (U+0000 edge, U+0001 folder, U+0002 collapsed, U+0003 folder link); true otherwise. */
export const isPackageId = (id: string): boolean => {
  const first = id.charCodeAt(0);
  const isReserved = first <= LAST_RESERVED_CODE_UNIT;

  return !isReserved;
};
