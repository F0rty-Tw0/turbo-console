import type { Inspection } from '../../common/inspection.type.ts';

export const pkg = (name: string): Inspection => {
  const inspection: Inspection = { kind: 'package', name };

  return inspection;
};

export const link = (source: string, target: string): Inspection => {
  const inspection: Inspection = { kind: 'link', source, target };

  return inspection;
};

export const pick = (start: string, isNudged: boolean): Inspection => {
  const inspection: Inspection = { kind: 'picking', start, isNudged };

  return inspection;
};

export const trace = (start: string, end: string): Inspection => {
  const inspection: Inspection = { kind: 'trace', start, end };

  return inspection;
};
