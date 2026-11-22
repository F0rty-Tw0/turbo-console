import type { GraphOpenImportMessage } from '../../bridge/common/graph-imports.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { HandledModules, ModuleElementKind } from '../common/module-canvas.type.ts';
import type { ModuleInputDeps, ModuleInputMode, ModuleRedraw } from '../common/module-mode.type.ts';

const DIR_PREFIX = 'dir:';

const FILE_PREFIX = 'file:';

const STUB_PREFIX = 'pkg:';

const ROOT_BOX_ID = DIR_PREFIX;

/** The saved view while the mode is Shown; `null` otherwise, so every canvas action is ignored. */
const shownViewOf = (mode: ModuleInputMode): ModulesViewState | null => {
  const phase = mode.phase();
  const view = mode.view();

  if (phase.kind !== 'shown') return null;

  return view;
};

/**
 * The expansion after a folder tap, toggled by the saved list rather than the drawn kind, which lags until the anchored
 * redraw lands: a folder not listed opens, a listed one other than the root closes (folders expanded inside it stay
 * listed, never drawn while it is closed, spec §7.3). So a double tap opens and closes, and no path is listed twice;
 * `null` for the root box and for a card that is no folder.
 */
const expandedAfterTap = (view: ModulesViewState, kind: ModuleElementKind | null, id: string): string[] | null => {
  const expanded = view.expanded ?? [];
  const path = id.slice(DIR_PREFIX.length);
  const isOther = (open: string): boolean => open !== path;
  const isFolder = kind === 'dir' || kind === 'box';
  const isListed = expanded.includes(path);

  if (!isFolder || id === ROOT_BOX_ID) return null;

  if (isListed) return expanded.filter(isOther);

  return [...expanded, path];
};

/**
 * The canvas events in modules mode (spec §7.4), each ignored unless Shown: a folder tap toggles it and redraws anchored
 * on it, a file or stub tap paints it; a file double tap opens it, a stub double tap enters that package. A node tap
 * then focuses the container, as in package mode, since Cytoscape blurs it on the press.
 */
export const moduleInputOf = (deps: ModuleInputDeps): HandledModules => {
  const { mode, canvas, container, bridge } = deps;
  const tapNode = (id: string): void => {
    const view = shownViewOf(mode);
    const kind = canvas.kindOf(id);
    const isCard = kind === 'file' || kind === 'stub';

    if (view === null) return;

    container.focus();

    if (isCard) {
      canvas.paint(id);

      return;
    }

    const expanded = expandedAfterTap(view, kind, id);

    if (expanded === null) return;

    const toggled: ModulesViewState = { ...view, expanded };
    const redraw: ModuleRedraw = { kind: 'anchor', id };

    mode.update(toggled, redraw);
  };
  const doubleTapNode = (id: string): void => {
    const phase = mode.phase();
    const kind = canvas.kindOf(id);

    if (phase.kind !== 'shown') return;

    const file = id.slice(FILE_PREFIX.length);
    const stubName = id.slice(STUB_PREFIX.length);
    const message: GraphOpenImportMessage = { type: 'openImport', packageName: phase.name, file, line: 0 };

    if (kind === 'file') bridge.post(message);
    else if (kind === 'stub') mode.enter(stubName);
  };
  const tapBackground = (): void => {
    const view = shownViewOf(mode);

    if (view !== null) canvas.paint(null);
  };
  const isActive = (): boolean => mode.isActive();
  const saveCamera = (): void => mode.saveCamera();
  const handled: HandledModules = { isActive, tapNode, doubleTapNode, tapBackground, saveCamera };

  return handled;
};
