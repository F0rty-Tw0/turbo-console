import type { EditorFolder, RootFolder } from '../common/root.type.ts';

/**
 * The workspace folders on the local disk, keyed by `uri.fsPath` exactly as VS Code gives it (drive-letter case and `\`
 * on Windows kept). A virtual folder (a remote repository) is left out: its path names nothing on this disk.
 */
export const rootFoldersOf = (folders: EditorFolder[]): RootFolder[] => {
  const local = folders.filter((folder) => folder.uri.scheme === 'file');

  return local.map((folder) => {
    const root: RootFolder = { root: folder.uri.fsPath, name: folder.name };

    return root;
  });
};
