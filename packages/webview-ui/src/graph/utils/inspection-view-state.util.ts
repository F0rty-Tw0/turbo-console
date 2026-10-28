import { inspectionFieldsOf } from './inspection-state.util.ts';
import type { PackageViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { InspectionSave } from '../common/graph-inspection.type.ts';
import type { ControlsViewFields } from '../common/graph-page.type.ts';

/** The view state a save writes: the camera, the controls, the inspection's fields and whether Details is open. */
export const viewStateOf = (
  hash: string,
  camera: Pick<PackageViewState, 'zoom' | 'pan' | 'fitted'>,
  controls: ControlsViewFields,
  shown: InspectionSave
): PackageViewState => {
  const { zoom, pan, fitted } = camera;
  const { inspection, detailsOpen } = shown;
  const fields = inspectionFieldsOf(inspection);
  const state: PackageViewState = { hash, zoom, pan, fitted, ...controls, ...fields, detailsOpen };

  return state;
};
