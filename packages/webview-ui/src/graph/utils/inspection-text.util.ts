import { closureOf } from './closure.util.ts';
import { neighboursOf } from './neighbours.util.ts';
import { pluralOf } from './plural.util.ts';
import { selectionText } from './selection-text.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { HINT_NUDGE_TEXT } from '../common/details.const.ts';
import type { Inspection, TraceInspection } from '../common/inspection.type.ts';
import type { TraceResult } from '../common/trace.type.ts';

const packageText = (name: string, edges: GraphEdge[]): string => {
  const closure = closureOf(name, edges);
  const direct = neighboursOf(name, edges);

  return selectionText(name, closure, direct);
};

/** A trace reads start → end whichever way its path runs (D21); hidden path packages are counted after it. */
const traceText = (inspection: TraceInspection, trace: TraceResult | null, visible: ReadonlySet<string>): string => {
  const { start, end } = inspection;

  if (trace === null) return '';

  if (trace.direction === 'none') return `No dependency path between ${start} and ${end}`;

  const isHidden = (name: string): boolean => !visible.has(name);
  const hidden = trace.path.filter(isHidden).length;
  const packages = pluralOf(trace.path.length, 'package', 'packages');
  const hiddenText = hidden > 0 ? `, ${hidden} hidden` : '';

  return `Trace ${start} → ${end}: ${packages}${hiddenText}`;
};

/** The toolbar status line for an inspection (spec §4.3); `''` for none, and for a trace not yet walked. */
export const inspectionTextOf = (
  inspection: Inspection,
  edges: GraphEdge[],
  trace: TraceResult | null,
  visible: ReadonlySet<string>
): string => {
  switch (inspection.kind) {
    case 'none':
      return '';
    case 'package':
      return packageText(inspection.name, edges);
    case 'link':
      return `${inspection.source} depends on ${inspection.target}`;
    case 'picking':
      return inspection.isNudged ? HINT_NUDGE_TEXT : `Trace from ${inspection.start}: select the end package`;
    case 'trace':
      return traceText(inspection, trace, visible);
  }
};
