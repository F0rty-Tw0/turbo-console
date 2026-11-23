import { byCodeUnit } from './folder-group.util.ts';
import type { ModuleDir, ModuleDirDraft, ModuleTree } from '../common/module-tree.type.ts';

const draftOf = (path: string, name: string): ModuleDirDraft => {
  const draft: ModuleDirDraft = { path, name, dirs: new Map(), files: [] };

  return draft;
};

const childOf = (parent: ModuleDirDraft, name: string): ModuleDirDraft => {
  const existing = parent.dirs.get(name);

  if (existing !== undefined) return existing;

  const path = parent.path === '' ? name : `${parent.path}/${name}`;
  const child = draftOf(path, name);

  parent.dirs.set(name, child);

  return child;
};

const byName = (left: ModuleDir, right: ModuleDir): number => byCodeUnit(left.name, right.name);

const sumOf = (total: number, dir: ModuleDir): number => total + dir.fileCount;

/** Files of one folder share its prefix, so ordering their full paths orders their basenames. */
const finishedOf = (draft: ModuleDirDraft, files: string[]): ModuleDir => {
  const children = draft.dirs.values();
  const drafts = [...children];
  const dirs = drafts.map((child) => finishedOf(child, files));
  const byPath = (left: number, right: number): number => byCodeUnit(files[left] ?? '', files[right] ?? '');
  const own = [...draft.files];

  dirs.sort(byName);
  own.sort(byPath);

  const nestedCount = dirs.reduce(sumOf, 0);
  const dir: ModuleDir = { path: draft.path, name: draft.name, dirs, files: own, fileCount: own.length + nestedCount };

  return dir;
};

/** The folder tree of the scanned package files (posix, relative to the package dir); the input is not changed. */
export const moduleTreeOf = (files: string[]): ModuleTree => {
  const root = draftOf('', '');

  for (const [index, file] of files.entries()) {
    const segments = file.split('/');
    const folders = segments.slice(0, -1);
    const parent = folders.reduce(childOf, root);

    parent.files.push(index);
  }

  const tree: ModuleTree = { files, root: finishedOf(root, files) };

  return tree;
};
