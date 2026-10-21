import { hasEdge } from './edge-exists.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, LinkInspection, TraceInspection } from '../common/inspection.type.ts';

const recheckLink = (current: LinkInspection, visible: ReadonlySet<string>, edges: GraphEdge[]): Inspection => {
  const hasSource = visible.has(current.source);
  const hasTarget = visible.has(current.target);
  const isDrawn = hasEdge(edges, current.source, current.target);
  const stays = hasSource && hasTarget && isDrawn;

  return stays ? current : NO_INSPECTION;
};

const recheckTrace = (current: TraceInspection, visible: ReadonlySet<string>): Inspection => {
  const hasStart = visible.has(current.start);
  const hasEnd = visible.has(current.end);

  if (!hasStart) return NO_INSPECTION;

  const startOnly: Inspection = { kind: 'package', name: current.start };

  return hasEnd ? current : startOnly;
};

const recheckName = (current: Inspection, name: string, visible: ReadonlySet<string>): Inspection => {
  const isVisible = visible.has(name);

  return isVisible ? current : NO_INSPECTION;
};

/** What the page keeps showing after a filter change; hidden middle packages never end a trace (D5). */
export const recheckInspection = (current: Inspection, visible: ReadonlySet<string>, edges: GraphEdge[]): Inspection => {
  switch (current.kind) {
    case 'none':
      return current;
    case 'package':
      return recheckName(current, current.name, visible);
    case 'link':
      return recheckLink(current, visible, edges);
    case 'picking':
      return recheckName(current, current.start, visible);
    case 'trace':
      return recheckTrace(current, visible);
  }
};
