import { filteredCandidatesOf, litCandidatesOf } from './candidate-filter.util.ts';
import { candidatesOf } from './trace-candidates.util.ts';
import { traceOf } from './trace.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { ShownInspection } from '../common/graph-details.type.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { TraceCandidates } from '../common/trace.type.ts';

/** The inspected package: a `package` inspection's name, `null` in every other kind. */
export const selectedOf = (inspection: Inspection): string | null => {
  if (inspection.kind !== 'package') return null;

  return inspection.name;
};

/** The inspection with what its view is built from: a trace's shortest path, a picking's end candidates. */
export const shownOf = (inspection: Inspection, edges: GraphEdge[], visible: ReadonlySet<string>): ShownInspection => {
  switch (inspection.kind) {
    case 'picking': {
      const candidates = candidatesOf(edges, inspection.start, visible);
      const picking: ShownInspection = { ...inspection, candidates };

      return picking;
    }
    case 'trace': {
      const trace = traceOf(edges, inspection.start, inspection.end);
      const traced: ShownInspection = { ...inspection, trace };

      return traced;
    }
    case 'none':
    case 'package':
    case 'link':
      return inspection;
  }
};

/** The names lit while picking: the path candidates the filter leaves; none when not picking. */
export const litOf = (candidates: TraceCandidates | null, packages: GraphPackage[], filter: string): ReadonlySet<string> => {
  if (candidates === null) return new Set<string>();

  const filtered = filteredCandidatesOf(candidates, packages, filter);

  return litCandidatesOf(filtered);
};
