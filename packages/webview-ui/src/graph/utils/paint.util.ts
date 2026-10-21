import { closureOf } from './closure.util.ts';
import { edgeIdOf } from './edge-id.util.ts';
import { edgeStateOf, nodeStateOf } from './highlight.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import type { Inspection, LinkInspection, TraceInspection } from '../common/inspection.type.ts';
import type { Paint } from '../common/paint.type.ts';
import type { TraceResult } from '../common/trace.type.ts';

const paintWith = (nodeState: (name: string) => ProbeState, edgeState: (edge: GraphEdge) => ProbeState): Paint => {
  const paint: Paint = { nodeState, edgeState };

  return paint;
};

const everyState = (state: ProbeState): Paint => {
  return paintWith(
    (): ProbeState => state,
    (): ProbeState => state
  );
};

const packagePaint = (name: string, edges: GraphEdge[]): Paint => {
  const closure = closureOf(name, edges);

  return paintWith(
    (node: string): ProbeState => nodeStateOf(node, name, closure),
    (edge: GraphEdge): ProbeState => edgeStateOf(edge, name, closure)
  );
};

const linkPaint = (link: LinkInspection): Paint => {
  const key = edgeIdOf(link);
  const nodeState = (name: string): ProbeState => {
    const isEnd = name === link.source || name === link.target;

    return isEnd ? 'highlighted' : 'dimmed';
  };
  const edgeState = (edge: GraphEdge): ProbeState => (edgeIdOf(edge) === key ? 'selected' : 'dimmed');

  return paintWith(nodeState, edgeState);
};

const pickingPaint = (start: string, lit: ReadonlySet<string>): Paint => {
  const nodeState = (name: string): ProbeState => {
    if (name === start) return 'selected';

    return lit.has(name) ? 'highlighted' : 'dimmed';
  };

  return paintWith(nodeState, (): ProbeState => 'dimmed');
};

const tracePaint = (inspection: TraceInspection, trace: TraceResult | null): Paint => {
  const traceEdges = trace?.edges ?? [];
  const path = new Set(trace?.path ?? []);
  const pathEdges = new Set(traceEdges.map(edgeIdOf));
  const nodeState = (name: string): ProbeState => {
    if (name === inspection.start || name === inspection.end) return 'selected';

    return path.has(name) ? 'highlighted' : 'dimmed';
  };
  const edgeState = (edge: GraphEdge): ProbeState => (pathEdges.has(edgeIdOf(edge)) ? 'highlighted' : 'dimmed');

  return paintWith(nodeState, edgeState);
};

/**
 * The state of each package and link for what the page inspects. `lit` holds the path candidates the picking filter
 * leaves in the lists; it only matters while picking.
 */
export const paintOf = (inspection: Inspection, edges: GraphEdge[], trace: TraceResult | null, lit: ReadonlySet<string>): Paint => {
  switch (inspection.kind) {
    case 'none':
      return everyState('normal');
    case 'package':
      return packagePaint(inspection.name, edges);
    case 'link':
      return linkPaint(inspection);
    case 'picking':
      return pickingPaint(inspection.start, lit);
    case 'trace':
      return tracePaint(inspection, trace);
  }
};
