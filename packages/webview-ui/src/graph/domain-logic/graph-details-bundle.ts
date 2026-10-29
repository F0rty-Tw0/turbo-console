import { explainInput, onClick, selectInput, wired } from './graph-details-wire-parts.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { BundleDetails } from '../common/details-view.type.ts';
import type { BundleEndModel, BundleViewModel } from '../common/details.type.ts';
import type { DetailsContext, DetailsEnv, DetailsView } from '../common/graph-details.type.ts';
import type { BundleInspection, InspectionInput } from '../common/inspection.type.ts';
import { bundleModelOf } from '../utils/details-model.util.ts';

/** A package end selects the package; a folder end inspects the folder, which stays collapsed. */
const endInputOf = (end: BundleEndModel): InspectionInput => {
  if (end.folder === null) return selectInput(end.text);

  const input: InspectionInput = { kind: 'selectFolder', folder: end.folder };

  return input;
};

const wireBundle = (view: BundleDetails, model: BundleViewModel, env: DetailsEnv): void => {
  const { onInput } = env.deps;

  onClick(view.source, (): void => onInput(endInputOf(model.source)));
  onClick(view.target, (): void => onInput(endInputOf(model.target)));

  for (const row of view.links) {
    onClick(row.pickSource, (): void => onInput(selectInput(row.source)));
    onClick(row.pickTarget, (): void => onInput(selectInput(row.target)));
    onClick(row.explain, (): void => onInput(explainInput(row.source, row.target)));
  }
};

const isSameLink = (edge: GraphEdge, row: GraphEdge | undefined): boolean => {
  return edge.source === row?.source && edge.target === row.target;
};

/** `null` once the scene has no link between the two ends. */
export const bundleViewOf = (inspection: BundleInspection, context: DetailsContext, env: DetailsEnv): BundleDetails | null => {
  const model = bundleModelOf(inspection.source, inspection.target, context);

  if (model === null) return null;

  const view = wired(env.deps.views.bundle(model, env.isOverlay), env);

  wireBundle(view, model, env);

  return view;
};

/** A bundle view is kept while it lists the same package links; its rows hold no state, so a change rebuilds it. */
export const isSameBundleView = (view: DetailsView, inspection: BundleInspection, context: DetailsContext): boolean => {
  if (view.kind !== 'bundle') return false;

  const model = bundleModelOf(inspection.source, inspection.target, context);

  if (model === null) return false;

  const { links } = view;
  const isSameLength = model.links.length === links.length;

  return isSameLength && model.links.every((edge, index) => isSameLink(edge, links[index]));
};
