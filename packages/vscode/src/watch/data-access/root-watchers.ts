import * as vscode from 'vscode';

import { KEYED_GLOB } from '../common/watch.const.ts';
import type { WatchPorts } from '../common/watch.type.ts';
import { isIgnoredPath, isPackageDelete, toRelative } from '../utils/watch-event.util.ts';

const EVERYTHING_GLOB = '**';

/**
 * Spec §4.3 watchers of one root: keyed files on create, change and delete, outside `node_modules`; and deletes of
 * anything, kept only when the deleted path holds a package dir of the shown model. Returns the function that stops both.
 */
export const watchRoot = (root: string, ports: WatchPorts): (() => void) => {
  const onKeyed = (uri: vscode.Uri): void => {
    const relative = toRelative(root, uri.fsPath);

    if (relative === null) return;

    const isIgnored = isIgnoredPath(relative);

    if (!isIgnored) ports.changed();
  };
  const onDelete = (uri: vscode.Uri): void => {
    const relative = toRelative(root, uri.fsPath);

    if (relative === null) return;

    const packagePaths = ports.packagePaths();
    const isDelete = isPackageDelete(relative, packagePaths);

    if (isDelete) ports.changed();
  };
  const keyedPattern = new vscode.RelativePattern(root, KEYED_GLOB);
  const keyed = vscode.workspace.createFileSystemWatcher(keyedPattern);
  const deletePattern = new vscode.RelativePattern(root, EVERYTHING_GLOB);
  const deletes = vscode.workspace.createFileSystemWatcher(deletePattern, true, true, false);
  const keyedCreate = keyed.onDidCreate(onKeyed);
  const keyedChange = keyed.onDidChange(onKeyed);
  const keyedDelete = keyed.onDidDelete(onKeyed);
  const anyDelete = deletes.onDidDelete(onDelete);
  const watching = vscode.Disposable.from(keyedCreate, keyedChange, keyedDelete, anyDelete, keyed, deletes);
  const stop = (): void => {
    watching.dispose();
  };

  return stop;
};
