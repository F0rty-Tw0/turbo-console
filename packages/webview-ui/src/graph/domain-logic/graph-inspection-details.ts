import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { FolderActions } from '../common/folder-actions.type.ts';
import type { GraphDetailsDeps } from '../common/graph-details.type.ts';
import type { GraphInspectionDeps, InspectionActions } from '../common/graph-inspection.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';

const CLEAR: InspectionInput = { kind: 'clear' };

const CANVAS_ESCAPE: InspectionInput = { kind: 'escape', where: 'canvas' };

const PANEL_ESCAPE: InspectionInput = { kind: 'escape', where: 'panel' };

/** Asks the host for the manifest entry behind the link `source` → `target`. */
export const postExplain = (bridge: Bridge, source: string, target: string): void => {
  bridge.post({ type: 'explainEdge', source, target });
};

export const postOpenDetails = (bridge: Bridge, name: string): void => {
  bridge.post({ type: 'openDetails', packageName: name });
};

/** Focuses `folder`, or clears the focus when `folder` already is it, as the list header's Focus button does. */
const toggleFolderFocus = (deps: GraphInspectionDeps, folder: string): void => {
  const focused = deps.focusedFolder();

  if (focused === folder) deps.onClearFocus();
  else deps.onFocusFolder(folder);
};

/** A folder's actions over the same calls as the details panel's folder buttons and the list's folder header. */
export const folderActionsOf = (deps: GraphInspectionDeps, onInput: (input: InspectionInput) => void): FolderActions => {
  const actions: FolderActions = {
    select: (folder): void => onInput({ kind: 'selectFolder', folder }),
    toggle: (folder): void => deps.folders.toggle(folder),
    focusFolder: (folder): void => toggleFolderFocus(deps, folder),
    clearFocus: (): void => deps.onClearFocus(),
    showFolder: (folder): void => deps.onShowFolder(folder)
  };

  return actions;
};

/** The details panel's deps: its inputs and Package Details requests go to `actions`, explain and Open to the bridge, its list and folder actions to the controls and the folders. */
export const detailsDepsOf = (deps: GraphInspectionDeps, actions: InspectionActions): GraphDetailsDeps => {
  const { bridge, page, view, views, overlay } = deps;
  const folderActions = folderActionsOf(deps, (input): void => actions.input(input));
  const detailsDeps: GraphDetailsDeps = {
    page,
    views,
    overlay,
    onInput: (input): void => actions.input(input),
    onExplain: (source, target): void => postExplain(bridge, source, target),
    onOpenDetails: (name): void => actions.openDetailsOf(name),
    onFocus: (name): void => deps.onFocusOn(name),
    onExclude: (name): void => deps.onExclude(name),
    onShow: (name): void => deps.onShow(name),
    onShowTasks: (name): void => deps.onShowTasks(name),
    hasTasks: (name): boolean => deps.hasTasks(name),
    onToggleFolder: folderActions.toggle,
    onFocusFolder: folderActions.focusFolder,
    onExcludeFolder: (folder): void => deps.onExcludeFolder(folder),
    onFilter: (text): void => actions.canvas.filter(text),
    onOpenManifest: (packageName, line): void => bridge.post({ type: 'openManifest', packageName, line }),
    onResize: (): void => view.resize(),
    isPackageMode: deps.isPackageMode,
    onLayout: (): void => actions.keepClear(),
    onOpened: (): void => actions.keepClear(),
    onSave: (): void => actions.save()
  };

  return detailsDeps;
};

/** Escape in the details panel, not a held repeat, steps the inspection back. */
export const onPanelKey = (event: KeyboardEvent, deps: Pick<GraphDetailsDeps, 'onInput'>): void => {
  const isEscape = !event.repeat && event.key === 'Escape';

  if (isEscape) deps.onInput(PANEL_ESCAPE);
};

const onKey = (event: KeyboardEvent, actions: InspectionActions): void => {
  if (event.repeat) return;

  if (event.key === 'Escape') actions.input(CANVAS_ESCAPE);

  if (event.key === 'Enter') actions.enter();
};

/**
 * `Clear selection`, and Escape and Enter on the graph container only, so a key on a toolbar button never acts here.
 * Both act only while the package graph owns the canvas.
 */
export const wireInspectionKeys = (deps: GraphInspectionDeps, actions: InspectionActions): void => {
  const onContainerKey = (event: KeyboardEvent): void => {
    const isPackageMode = deps.isPackageMode();

    if (isPackageMode) onKey(event, actions);
  };
  const onClear = (): void => {
    const isPackageMode = deps.isPackageMode();

    if (isPackageMode) actions.input(CLEAR);
  };

  deps.page.clear.addEventListener('click', onClear);
  deps.page.container.addEventListener('keydown', onContainerKey);
};
