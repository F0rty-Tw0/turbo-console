import type { GraphInspectionDeps, InspectionSave } from '../common/graph-inspection.type.ts';
import { viewStateOf } from '../utils/inspection-view-state.util.ts';

/** Schedules a debounced save of the camera, the controls and `shown` for the drawn graph; nothing while none is drawn. */
export const scheduleSave = (deps: GraphInspectionDeps, shown: InspectionSave): void => {
  const drawn = deps.drawn();

  if (drawn === null) return;

  const viewport = deps.view.viewport();
  const controls = deps.controls();
  const state = viewStateOf(drawn.hash, viewport, controls, shown);

  deps.saver.schedule(state);
};
