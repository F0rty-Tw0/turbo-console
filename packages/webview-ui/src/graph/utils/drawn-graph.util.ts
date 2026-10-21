import { drawableEdges } from './closure.util.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';

/** The page's view of a ready state: package names for the layout, the records for the controls, only edges between packages. */
export const drawnGraphOf = (state: GraphReady): DrawnGraph => {
  const names = state.packages.map((pkg) => pkg.name);
  const edges = drawableEdges(names, state.edges);
  const drawn: DrawnGraph = { hash: state.hash, packages: names, infos: state.packages, edges };

  return drawn;
};
