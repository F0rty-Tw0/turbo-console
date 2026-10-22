import { COLLAPSED_ID_PREFIX, FOLDER_ID_PREFIX, FOLDER_LINK_ID_PREFIX } from '../common/graph.const.ts';

const LAST_RESERVED_CODE_UNIT = 3;

/** The folder box id: the prefix plus the folder key, so no folder id equals a package name or an edge id. */
export const folderIdOf = (folder: string): string => `${FOLDER_ID_PREFIX}${folder}`;

/** False for the ids this feature owns (U+0000 edge, U+0001 folder, U+0002 collapsed, U+0003 folder link); true otherwise. */
export const isPackageId = (id: string): boolean => {
  const first = id.charCodeAt(0);
  const isReserved = first <= LAST_RESERVED_CODE_UNIT;

  return !isReserved;
};

/** The collapsed folder node id: the prefix plus the folder key, apart from `folderIdOf` and every package name. */
export const collapsedIdOf = (folder: string): string => `${COLLAPSED_ID_PREFIX}${folder}`;

/** The folder link id; `source` and `target` are element ids, and U+0000 cannot occur in either. */
export const folderLinkIdOf = (source: string, target: string): string => `${FOLDER_LINK_ID_PREFIX}${source}\u0000${target}`;

/** The folder key of a box or collapsed node id; `null` for a package, edge or folder link id. */
export const folderOfElementId = (id: string): string | null => {
  const isBox = id.startsWith(FOLDER_ID_PREFIX);
  const isCollapsed = id.startsWith(COLLAPSED_ID_PREFIX);
  const isFolderId = isBox || isCollapsed;

  if (!isFolderId) return null;

  return id.slice(FOLDER_ID_PREFIX.length);
};
