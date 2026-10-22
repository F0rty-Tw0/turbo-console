import { isLinkKept } from './link-kept.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { GraphLinkRef, GraphTraceRef } from '../../bridge/common/graph-view-state.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionFields, LinkInspection, TraceInspection } from '../common/inspection.type.ts';

const fieldsOf = (parts: Partial<InspectionFields>): InspectionFields => {
  const fields: InspectionFields = { selected: null, link: null, trace: null, folder: null, ...parts };

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
    case 'folder':
      return fieldsOf({ folder: inspection.folder });
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
  const isKept = isLinkKept(saved.link, visible, edges);

  if (!isKept) return null;

  const link: Inspection = { kind: 'link', source, target };

  return link;
};

const folderFrom = (saved: InspectionFields, folders: ReadonlySet<string>): Inspection | null => {
  const { folder } = saved;

  if (folder === null) return null;

  const isKnown = folders.has(folder);

  if (!isKnown) return null;

  const inspection: Inspection = { kind: 'folder', folder };

  return inspection;
};

const selectedFrom = (saved: InspectionFields, visible: ReadonlySet<string>): Inspection | null => {
  const { selected } = saved;

  if (selected === null) return null;

  const isVisible = visible.has(selected);

  if (!isVisible) return null;

  const name: Inspection = { kind: 'package', name: selected };

  return name;
};

/**
 * The inspection a new page rebuilds from its saved state: the trace, else the link, else the folder, else the selection,
 * whichever still fits the drawn graph. `folders` holds the existing, not hidden folders.
 */
export const restoredInspection = (
  saved: InspectionFields,
  edges: GraphEdge[],
  visible: ReadonlySet<string>,
  folders: ReadonlySet<string>
): Inspection => {
  const trace = traceFrom(saved, visible);
  const link = linkFrom(saved, edges, visible);
  const folder = folderFrom(saved, folders);
  const selected = selectedFrom(saved, visible);

  return trace ?? link ?? folder ?? selected ?? NO_INSPECTION;
};
