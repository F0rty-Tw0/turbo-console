import { inspectionFieldsOf } from './inspection-state.util.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { InspectionSave } from '../common/graph-inspection.type.ts';
import type { ControlsViewFields, Viewport } from '../common/graph-page.type.ts';

/** The view state a save writes: the camera, the controls, the inspection's fields and whether Details is open. */
export const viewStateOf = (hash: string, viewport: Viewport, controls: ControlsViewFields, shown: InspectionSave): GraphViewState => {
  const { zoom, pan } = viewport;
  const { inspection, detailsOpen } = shown;
  const fields = inspectionFieldsOf(inspection);
  const state: GraphViewState = { hash, zoom, pan, ...controls, ...fields, detailsOpen };

  return state;
};
