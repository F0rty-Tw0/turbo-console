import { drawableEdges } from './closure.util.ts';
import { labelsOf } from './package-label.util.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';

/**
 * The page's view of a ready state: package names for the layout, the records for the controls, only edges between
 * packages, and the package labels for `scopeShown`.
 */
export const drawnGraphOf = (state: GraphReady): DrawnGraph => {
  const { hash, packages, scopeShown } = state;
  const names = packages.map((pkg) => pkg.name);
  const edges = drawableEdges(names, state.edges);
  const labels = labelsOf(packages, scopeShown);
  const drawn: DrawnGraph = { hash, packages: names, infos: packages, edges, scopeShown, labels };

  return drawn;
};
