import { filteredCandidatesOf, litCandidatesOf } from './candidate-filter.util.ts';
import { candidatesOf } from './trace-candidates.util.ts';
import { traceOf } from './trace.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { TraceCandidates, TraceResult } from '../common/trace.type.ts';

/** The inspected package: a `package` inspection's name, `null` in every other kind. */
export const selectedOf = (inspection: Inspection): string | null => {
  if (inspection.kind !== 'package') return null;

  return inspection.name;
};

/** The shortest path a `trace` inspection shows; `null` in every other kind. */
export const traceFor = (inspection: Inspection, edges: GraphEdge[]): TraceResult | null => {
  if (inspection.kind !== 'trace') return null;

  return traceOf(edges, inspection.start, inspection.end);
};

/** The end candidates a `picking` inspection lists; `null` in every other kind. */
export const candidatesFor = (inspection: Inspection, edges: GraphEdge[], visible: ReadonlySet<string>): TraceCandidates | null => {
  if (inspection.kind !== 'picking') return null;

  return candidatesOf(edges, inspection.start, visible);
};

/** The names lit while picking: the path candidates the filter leaves; none when not picking. */
export const litOf = (candidates: TraceCandidates | null, packages: GraphPackage[], filter: string): ReadonlySet<string> => {
  if (candidates === null) return new Set<string>();

  const filtered = filteredCandidatesOf(candidates, packages, filter);

  return litCandidatesOf(filtered);
};
