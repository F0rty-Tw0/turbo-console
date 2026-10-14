import type { TurboErrorKind, WorkspaceModel } from '@turbo-console/core';

import { dirRows, packageRow } from './dir-rows.util.ts';
import { folderTree, packageList } from './folder-tree.util.ts';
import { packageMapOf } from './package-map.util.ts';
import { rowIdOf } from './row-id.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { ROOT_FOLDER_ICON } from '../common/icon.const.ts';
import { MESSAGE_ICONS, MESSAGE_TEXTS, SHOW_OUTPUT_COMMAND } from '../common/message.const.ts';
import type { MessageKind, TreeMode, TreeRow } from '../common/tree-row.type.ts';

const messageRow = (root: string, kind: MessageKind): TreeRow => {
  const row: TreeRow = {
    id: rowIdOf('msg', root, kind),
    kind: 'msg',
    root,
    key: kind,
    packageName: null,
    label: MESSAGE_TEXTS[kind],
    description: '',
    icon: MESSAGE_ICONS[kind],
    contextValue: 'turboMessage',
    collapsible: 'none',
    tooltip: [],
    command: SHOW_OUTPUT_COMMAND
  };

  return row;
};

const messageRows = (root: string, kind: MessageKind): TreeRow[] => {
  const row = messageRow(root, kind);

  return [row];
};

const binaryMessageOf = (kind: TurboErrorKind): MessageKind => {
  if (kind === 'not-found') return 'binary-not-found';

  return kind === 'version-unsupported' ? 'binary-version' : 'binary-other';
};

/** The folder or list rows of a model, or the `no-packages` row when it has none. */
const packageRowsOf = (root: string, model: WorkspaceModel, mode: TreeMode): TreeRow[] => {
  if (model.packages.length === 0) return messageRows(root, 'no-packages');

  const packages = packageMapOf(model.packages);

  if (mode === 'folders') return dirRows(root, folderTree(model.packages), packages);

  const names = packageList(model.packages);
  const listed = names.map((name) => packages.get(name));

  return listed.filter((pkg) => pkg !== undefined).map((pkg) => packageRow(root, pkg));
};

/**
 * Spec §4.4 precedence: a binary error replaces everything; a load error shows a warning ahead of the shown model, or
 * alone when there is none; then loading; otherwise the folder or list rows, or `no-packages` for an empty model (also
 * under the warning, so it never stands over nothing).
 */
export const rootRows = (state: RootState, mode: TreeMode): TreeRow[] => {
  const { root } = state.folder;
  const { model, error } = state;

  if (error?.stage === 'binary') return messageRows(root, binaryMessageOf(error.error.kind));

  if (model === null) return messageRows(root, error === null ? 'loading' : 'load-no-model');

  const listed = packageRowsOf(root, model, mode);

  if (error === null) return listed;

  const warning = messageRows(root, 'load-with-model');

  return [...warning, ...listed];
};

/** The folder node of a multi-root window: its key is the root path, so its id is `root:<root>`. */
export const rootNodeRow = (folder: RootFolder): TreeRow => {
  const row: TreeRow = {
    id: rowIdOf('root', folder.root, folder.root),
    kind: 'root',
    root: folder.root,
    key: folder.root,
    packageName: null,
    label: cleanText(folder.name, LABEL_MAX),
    description: '',
    icon: ROOT_FOLDER_ICON,
    contextValue: 'turboRoot',
    collapsible: 'expanded',
    tooltip: [],
    command: null
  };

  return row;
};
