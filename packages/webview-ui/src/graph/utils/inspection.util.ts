import { NO_INSPECTION, PLAIN_INPUT_KINDS } from '../common/inspection.const.ts';
import type { EscapeWhere, Inspection, InspectionInput, PlainInput, PlainInputKind, SelectVia } from '../common/inspection.type.ts';

const packageOf = (name: string): Inspection => {
  const inspection: Inspection = { kind: 'package', name };

  return inspection;
};

const traceOf = (start: string, end: string): Inspection => {
  const inspection: Inspection = { kind: 'trace', start, end };

  return inspection;
};

const selectFrom = (current: Inspection, name: string, via: SelectVia): Inspection => {
  if (current.kind !== 'picking') return packageOf(name);

  const isStart = name === current.start;
  const isPanel = via === 'panel';

  if (isStart || isPanel) return current;

  return traceOf(current.start, name);
};

const pickFrom = (current: Inspection, name: string): Inspection => {
  if (current.kind !== 'picking') return current;

  if (name === current.start) return current;

  return traceOf(current.start, name);
};

const linkFrom = (current: Inspection, source: string, target: string): Inspection => {
  if (current.kind !== 'picking') {
    const link: Inspection = { kind: 'link', source, target };

    return link;
  }

  if (current.isNudged) return current;

  const nudged: Inspection = { kind: 'picking', start: current.start, isNudged: true };

  return nudged;
};

const cancelFrom = (current: Inspection): Inspection => {
  if (current.kind !== 'picking') return current;

  return packageOf(current.start);
};

const escapeFrom = (current: Inspection, where: EscapeWhere): Inspection => {
  if (current.kind === 'picking') return cancelFrom(current);

  if (where === 'canvas') return NO_INSPECTION;

  return current;
};

const startTraceFrom = (current: Inspection): Inspection => {
  if (current.kind !== 'package') return current;

  const picking: Inspection = { kind: 'picking', start: current.name, isNudged: false };

  return picking;
};

const clearTraceFrom = (current: Inspection): Inspection => {
  if (current.kind !== 'trace') return current;

  return packageOf(current.start);
};

const swapEndsFrom = (current: Inspection): Inspection => {
  if (current.kind !== 'trace') return current;

  return traceOf(current.end, current.start);
};

const plainFrom = (current: Inspection, kind: PlainInputKind): Inspection => {
  switch (kind) {
    case 'background':
    case 'clear':
      return NO_INSPECTION;
    case 'startTrace':
      return startTraceFrom(current);
    case 'cancel':
      return cancelFrom(current);
    case 'clearTrace':
      return clearTraceFrom(current);
    case 'swapEnds':
      return swapEndsFrom(current);
  }
};

const isPlainInput = (input: InspectionInput): input is PlainInput => PLAIN_INPUT_KINDS.has(input.kind);

/** The next thing the page inspects after `input`; any input the rules do not name leaves `current` as it is. */
export const nextInspection = (current: Inspection, input: InspectionInput): Inspection => {
  if (isPlainInput(input)) return plainFrom(current, input.kind);

  switch (input.kind) {
    case 'select':
      return selectFrom(current, input.name, input.via);
    case 'pick':
      return pickFrom(current, input.name);
    case 'tapLink':
    case 'explain':
      return linkFrom(current, input.source, input.target);
    case 'escape':
      return escapeFrom(current, input.where);
  }
};
