import type { PackageNode } from '@turbo-console/core';

import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';

type DirNode = {
  readonly path: string;
  readonly label: string;
  readonly dirs: Map<string, DirNode>;
  readonly packages: string[];
};

const newDirNode = (path: string, label: string): DirNode => {
  const node: DirNode = { path, label, dirs: new Map(), packages: [] };

  return node;
};

/** `..` stays a plain segment, not resolved: turbo reports package paths inside the root, so none is expected. */
const isPathSegment = (segment: string): boolean => segment !== '' && segment !== '.';

export const segmentsOf = (path: string): string[] => {
  const posix = path.split('\\').join('/');

  return posix.split('/').filter(isPathSegment);
};

const childOf = (parent: DirNode, segment: string): DirNode => {
  const existing = parent.dirs.get(segment);

  if (existing) return existing;

  const path = parent.path === '' ? segment : `${parent.path}/${segment}`;
  const child = newDirNode(path, segment);

  parent.dirs.set(segment, child);

  return child;
};

const childrenOf = (node: DirNode): DirNode[] => {
  const children = node.dirs.values();

  return Array.from(children);
};

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;

  if (left > right) return 1;

  return 0;
};

const byLabel = (left: FolderDir, right: FolderDir): number => compareText(left.label, right.label);

/**
 * The child of a dir that holds no package and exactly one child dir, else `null`. A dir that is itself a package's
 * directory never merges: spec §4.6 keeps a directory node with the package's name for the nested packages.
 */
const onlyChildOf = (node: DirNode, packageDirs: Set<string>): DirNode | null => {
  const [first, ...rest] = childrenOf(node);
  const hasOwnPackage = node.packages.length > 0 || packageDirs.has(node.path);
  const isSingleChild = first !== undefined && rest.length === 0;

  return isSingleChild && !hasOwnPackage ? first : null;
};

const toFolderDir = (node: DirNode, packageDirs: Set<string>): FolderDir => {
  const only = onlyChildOf(node, packageDirs);

  if (only) {
    const merged = toFolderDir(only, packageDirs);
    const label = `${node.label}/${merged.label}`;
    const compressed: FolderDir = { ...merged, label };

    return compressed;
  }

  const children = childrenOf(node);
  const dirs = children.map((child) => toFolderDir(child, packageDirs)).sort(byLabel);
  const packages = node.packages.toSorted();
  const dir: FolderDir = { path: node.path, label: node.label, dirs, packages };

  return dir;
};

/**
 * Spec §4.6 item 3 folders mode: posix parent paths become directory nodes, single-child chains compress. Package names
 * are trusted unique (turbo rejects duplicates); a duplicate would be listed twice.
 */
export const folderTree = (packages: PackageNode[]): FolderTree => {
  const top = newDirNode('', '');
  const packageDirs = new Set<string>();

  for (const pkg of packages) {
    const segments = segmentsOf(pkg.path);
    const dir = segments.slice(0, -1).reduce(childOf, top);

    packageDirs.add(segments.join('/'));
    dir.packages.push(pkg.name);
  }

  const children = childrenOf(top);
  const dirs = children.map((child) => toFolderDir(child, packageDirs)).sort(byLabel);
  const topPackages = top.packages.toSorted();
  const tree: FolderTree = { dirs, packages: topPackages };

  return tree;
};

export const packageList = (packages: PackageNode[]): string[] => {
  const names = packages.map((pkg) => pkg.name);

  return names.sort();
};
