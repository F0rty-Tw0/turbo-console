import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';

const byCodeUnit = (left: string, right: string): number => {
  if (left < right) return -1;

  return left > right ? 1 : 0;
};

const byName = (left: GraphPackage, right: GraphPackage): number => byCodeUnit(left.name, right.name);

const byFolder = (left: FolderGroup, right: FolderGroup): number => {
  if (left.folder === right.folder) return 0;

  if (left.folder === '') return -1;

  if (right.folder === '') return 1;

  return byCodeUnit(left.folder, right.folder);
};

/** The path without its last `/` segment; `''`, the root folder, when nothing remains. */
export const folderOf = (path: string): string => {
  const cut = path.lastIndexOf('/');

  if (cut <= 0) return '';

  return path.slice(0, cut);
};

/** One group per parent folder, the root folder `''` first then by code unit, rows by name; the input is not changed. */
export const folderGroupsOf = (packages: GraphPackage[]): FolderGroup[] => {
  const byParent = new Map<string, GraphPackage[]>();

  for (const pkg of packages) {
    const folder = folderOf(pkg.path);
    const sameFolder = byParent.get(folder) ?? [];

    sameFolder.push(pkg);
    byParent.set(folder, sameFolder);
  }

  const groups: FolderGroup[] = [];

  for (const [folder, members] of byParent) {
    const sorted = [...members];

    sorted.sort(byName);

    const group: FolderGroup = { folder, packages: sorted };

    groups.push(group);
  }

  return groups.sort(byFolder);
};

/** The folder boxes of a layout mode: none while flat, else `folderGroupsOf`. */
export const modeGroupsOf = (packages: GraphPackage[], mode: LayoutGrouping): FolderGroup[] | null => {
  if (mode === 'flat') return null;

  return folderGroupsOf(packages);
};

/** Every tag of every package, once, sorted by code unit. */
export const tagsOf = (packages: GraphPackage[]): string[] => {
  const tags = new Set<string>();

  for (const pkg of packages) {
    for (const tag of pkg.tags) tags.add(tag);
  }

  const sorted = [...tags];

  return sorted.sort(byCodeUnit);
};
