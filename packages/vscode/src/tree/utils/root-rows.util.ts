import type { PackageNode, TurboErrorKind, WorkspaceModel } from '@turbo-console/core';

import { dirRows, packageRow } from './dir-rows.util.ts';
import { packageList } from './folder-tree.util.ts';
import { liveOf } from './live-of.util.ts';
import { rowIdOf } from './row-id.util.ts';
import { rowInputsOf, withRunningSuffix } from './running-count.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { ROOT_FOLDER_ICON } from '../common/icon.const.ts';
import { MESSAGE_ICONS, MESSAGE_TEXTS, SHOW_OUTPUT_COMMAND } from '../common/message.const.ts';
import type { ModelView } from '../common/model-view.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { MessageKind, RowInputs, TreeRow } from '../common/tree-row.type.ts';

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

export const binaryMessageOf = (kind: TurboErrorKind): MessageKind => {
  if (kind === 'not-found') return 'binary-not-found';

  return kind === 'version-unsupported' ? 'binary-version' : 'binary-other';
};

/** The list rows of a view: its shown packages, sorted by full name whatever the labels read (spec §4.8). */
const listRowsOf = (root: string, view: ModelView, inputs: RowInputs): TreeRow[] => {
  const shown = Array.from(view.packages.values());
  const names = packageList(shown);
  const listed = names.map((name) => view.packages.get(name)).filter((pkg) => pkg !== undefined);
  const rowOf = (pkg: PackageNode): TreeRow => packageRow(root, pkg, view, inputs);

  return listed.map(rowOf);
};

/** Spec 1c-b: an empty view is `no-turbo-packages` when showing scripts would list packages (never while they are shown). */
const emptyKindOf = (model: WorkspaceModel, context: RowContext, live: ReadonlySet<string>): MessageKind => {
  const withScripts = context.views(model, true, live);

  return withScripts.packages.size > 0 ? 'no-turbo-packages' : 'no-shown-packages';
};

/**
 * The folder or list rows of a model's shown packages; the `no-packages` row when it has no package, the
 * `no-shown-packages` row when none is shown, the `no-turbo-packages` row when only the scripts toggle hides them (spec §4.7).
 */
const packageRowsOf = (root: string, model: WorkspaceModel, context: RowContext): TreeRow[] => {
  if (model.packages.length === 0) return messageRows(root, 'no-packages');

  const live = liveOf(context, root);
  const view = context.views(model, context.scriptsShown, live);

  if (view.packages.size === 0) return messageRows(root, emptyKindOf(model, context, live));

  const inputs = rowInputsOf(root, view, context);

  if (context.mode === 'folders') return dirRows(root, view.folders, view, inputs);

  return listRowsOf(root, view, inputs);
};

/**
 * Spec §4.4 precedence: a binary error replaces everything; a load error shows a warning ahead of the shown model, or
 * alone when there is none; then loading; otherwise the folder or list rows, or `no-packages` / `no-shown-packages`
 * (also under the warning, so it never stands over nothing).
 */
export const rootRows = (state: RootState, context: RowContext): TreeRow[] => {
  const { root } = state.folder;
  const { model, error } = state;

  if (error?.stage === 'binary') return messageRows(root, binaryMessageOf(error.error.kind));

  if (model === null) return messageRows(root, error === null ? 'loading' : 'load-no-model');

  const listed = packageRowsOf(root, model, context);

  if (error === null) return listed;

  const warning = messageRows(root, 'load-with-model');

  return [...warning, ...listed];
};

const countLines = (view: ModelView | null): string[] => {
  if (view === null) return [];

  return [`Packages: ${view.packages.size}`];
};

/**
 * The folder node of a multi-root window: its key is the root path, so its id is `root:<root>`. Spec §4.9: the tooltip
 * holds the root path and its shown package count; a `null` view (no model yet) leaves the count out. UB5a §3.3: the
 * description counts the root's `running` runs.
 */
export const rootNodeRow = (folder: RootFolder, view: ModelView | null, running: number): TreeRow => {
  const counted = countLines(view);
  const description = withRunningSuffix('', running);
  const row: TreeRow = {
    id: rowIdOf('root', folder.root, folder.root),
    kind: 'root',
    root: folder.root,
    key: folder.root,
    packageName: null,
    label: cleanText(folder.name, LABEL_MAX),
    description,
    icon: ROOT_FOLDER_ICON,
    contextValue: 'turboRoot',
    collapsible: 'expanded',
    tooltip: [folder.root, ...counted],
    command: null
  };

  return row;
};

/** Behind a binary error no package or folder row is shown (spec §4.4), so none of them has children or a row. */
export const shownModelOf = (state: RootState): WorkspaceModel | null => {
  if (state.error?.stage === 'binary') return null;

  return state.model;
};

/**
 * A root's folder row read from its state: the view of its shown model, or none while it has none. It counts every
 * `running` run of the root, a run whose task left the model too, as the view badge does.
 */
export const rootRowOf = (state: RootState, context: RowContext): TreeRow => {
  const { root } = state.folder;
  const model = shownModelOf(state);
  const running = context.live(root).size;

  if (model === null) return rootNodeRow(state.folder, null, running);

  const view = context.views(model, context.scriptsShown, liveOf(context, root));

  return rootNodeRow(state.folder, view, running);
};
