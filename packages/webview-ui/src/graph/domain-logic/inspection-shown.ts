import { setClearEnabled } from './details-bar.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { DetailsContext } from '../common/graph-details.type.ts';
import type { CanvasShown, GraphInspectionDeps, ShownParts } from '../common/graph-inspection.type.ts';
import type { Inspection } from '../common/inspection.type.ts';
import { shownFoldersOf } from '../utils/folder-inspection.util.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';
import { shownOf } from '../utils/inspection-parts.util.ts';
import { recheckInspection } from '../utils/inspection-recheck.util.ts';
import { restoredInspection } from '../utils/inspection-state.util.ts';
import { inspectionTextOf } from '../utils/inspection-text.util.ts';
import { showableNamesOf } from '../utils/showable.util.ts';

/** What showing `next` builds for the graph on screen and the folder scene; `null` while the page shows no graph. */
export const shownPartsOf = (deps: GraphInspectionDeps, next: Inspection, isRebuild: boolean): ShownParts | null => {
  const drawn = deps.drawn();

  if (drawn === null) return null;

  const visible = deps.visible();
  const scene = deps.folders.scene();
  const details = shownOf(next, drawn.edges, visible);
  const trace = details.kind === 'trace' ? details.trace : null;
  const candidates = details.kind === 'picking' ? details.candidates : null;
  const showable = showableNamesOf(trace?.path ?? [], visible, deps.canShow);
  const focus = deps.focus();
  const focusedFolder = deps.focusedFolder();
  const context: DetailsContext = { drawn, visible, focus, showable, isRebuild, scene, focusedFolder };
  const canvas: CanvasShown = { inspection: next, drawn, visible, trace, candidates };
  const status = inspectionTextOf(next, drawn.edges, trace, visible, scene);
  const parts: ShownParts = { details, context, canvas, status };

  return parts;
};

/**
 * Shows `inspection` on the toolbar's status line and in the Details bar, only while the package graph owns the canvas:
 * task mode owns both meanwhile. The bar and its Clear selection show while something is selected.
 */
export const showInspectionBar = (
  deps: Pick<GraphInspectionDeps, 'page' | 'isPackageMode'>,
  inspection: Inspection,
  status: string
): void => {
  const isPackageMode = deps.isPackageMode();

  if (!isPackageMode) return;

  deps.page.status.textContent = status;
  deps.page.detailsSummary.textContent = status;
  setClearEnabled(deps.page, inspection.kind !== 'none');
};

/** `current` kept, narrowed or dropped for a new visible set; `null` while the page shows no graph. */
export const recheckedOf = (deps: GraphInspectionDeps, current: Inspection, visible: ReadonlySet<string>): Inspection | null => {
  const drawn = deps.drawn();

  if (drawn === null) return null;

  const scene = deps.folders.scene();

  return recheckInspection(current, visible, drawn.edges, scene);
};

/** The saved inspection, or none, for the placed graph and its drawn folders; `null` while the page shows no graph. */
export const restoredOf = (
  deps: GraphInspectionDeps,
  saved: GraphViewState | null,
  visible: ReadonlySet<string>
): Inspection | null => {
  const drawn = deps.drawn();

  if (drawn === null) return null;

  const state = saved ?? freshViewStateOf(drawn.hash);
  const scene = deps.folders.scene();
  const folders = shownFoldersOf(scene, visible);

  return restoredInspection(state, drawn.edges, visible, folders);
};
