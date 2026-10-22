import type { Inspection } from '../../../src/graph/common/inspection.type.ts';

export const packageInspection = (name: string): Inspection => {
  const inspection: Inspection = { kind: 'package', name };

  return inspection;
};

/** `source` depends on `target`. */
export const linkInspection = (source: string, target: string): Inspection => {
  const inspection: Inspection = { kind: 'link', source, target };

  return inspection;
};

export const pickingInspection = (start: string, isNudged = false): Inspection => {
  const inspection: Inspection = { kind: 'picking', start, isNudged };

  return inspection;
};

export const traceInspection = (start: string, end: string): Inspection => {
  const inspection: Inspection = { kind: 'trace', start, end };

  return inspection;
};

export const folderInspection = (folder: string): Inspection => {
  const inspection: Inspection = { kind: 'folder', folder };

  return inspection;
};
