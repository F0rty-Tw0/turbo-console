import { hasEdge } from './edge-exists.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { GraphLinkRef, GraphTraceRef } from '../../bridge/common/graph-view-state.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionFields, LinkInspection, TraceInspection } from '../common/inspection.type.ts';

const fieldsOf = (parts: Partial<InspectionFields>): InspectionFields => {
  const fields: InspectionFields = { selected: null, link: null, trace: null, ...parts };

  return fields;
};

const linkFieldsOf = (inspection: LinkInspection): InspectionFields => {
  const { source, target } = inspection;
  const link: GraphLinkRef = { source, target };

  return fieldsOf({ link });
};

const traceFieldsOf = (inspection: TraceInspection): InspectionFields => {
  const { start, end } = inspection;
  const trace: GraphTraceRef = { start, end };

  return fieldsOf({ selected: start, trace });
};

/** What the view state saves of an inspection; a picking saves like its start package, a trace also saves its start as `selected`. */
export const inspectionFieldsOf = (inspection: Inspection): InspectionFields => {
  switch (inspection.kind) {
    case 'none':
      return fieldsOf({});
    case 'package':
      return fieldsOf({ selected: inspection.name });
    case 'picking':
      return fieldsOf({ selected: inspection.start });
    case 'link':
      return linkFieldsOf(inspection);
    case 'trace':
      return traceFieldsOf(inspection);
  }
};

const traceFrom = (saved: InspectionFields, visible: ReadonlySet<string>): Inspection | null => {
  if (saved.trace === null) return null;

  const { start, end } = saved.trace;
  const areDistinct = start !== end;
  const hasStart = visible.has(start);
  const hasEnd = visible.has(end);
  const areVisible = hasStart && hasEnd;

  if (!areDistinct || !areVisible) return null;

  const trace: Inspection = { kind: 'trace', start, end };

  return trace;
};

const linkFrom = (saved: InspectionFields, edges: GraphEdge[], visible: ReadonlySet<string>): Inspection | null => {
  if (saved.link === null) return null;

  const { source, target } = saved.link;
  const hasSource = visible.has(source);
  const hasTarget = visible.has(target);
  const isDrawn = hasEdge(edges, source, target);
  const stays = hasSource && hasTarget && isDrawn;

  if (!stays) return null;

  const link: Inspection = { kind: 'link', source, target };

  return link;
};

const selectedFrom = (saved: InspectionFields, visible: ReadonlySet<string>): Inspection | null => {
  const { selected } = saved;

  if (selected === null) return null;

  const isVisible = visible.has(selected);

  if (!isVisible) return null;

  const name: Inspection = { kind: 'package', name: selected };

  return name;
};

/** The inspection a new page rebuilds from its saved state: the trace, else the link, else the selection, whichever still fits the drawn graph. */
export const restoredInspection = (saved: InspectionFields, edges: GraphEdge[], visible: ReadonlySet<string>): Inspection => {
  const trace = traceFrom(saved, visible);
  const link = linkFrom(saved, edges, visible);
  const selected = selectedFrom(saved, visible);

  return trace ?? link ?? selected ?? NO_INSPECTION;
};
