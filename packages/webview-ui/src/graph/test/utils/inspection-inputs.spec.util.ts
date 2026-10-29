import type { EscapeWhere, InspectionInput, SelectVia } from '../../common/inspection.type.ts';

export const select = (name: string, via: SelectVia): InspectionInput => {
  const built: InspectionInput = { kind: 'select', name, via };

  return built;
};

export const pickInput = (name: string): InspectionInput => {
  const built: InspectionInput = { kind: 'pick', name };

  return built;
};

export const tapLink = (source: string, target: string): InspectionInput => {
  const built: InspectionInput = { kind: 'tapLink', source, target };

  return built;
};

export const explain = (source: string, target: string): InspectionInput => {
  const built: InspectionInput = { kind: 'explain', source, target };

  return built;
};

export const escape = (where: EscapeWhere): InspectionInput => {
  const built: InspectionInput = { kind: 'escape', where };

  return built;
};

export const selectFolder = (folder: string): InspectionInput => {
  const built: InspectionInput = { kind: 'selectFolder', folder };

  return built;
};

export const BACKGROUND: InspectionInput = { kind: 'background' };

export const CLEAR: InspectionInput = { kind: 'clear' };

export const START_TRACE: InspectionInput = { kind: 'startTrace' };

export const CANCEL: InspectionInput = { kind: 'cancel' };

export const CLEAR_TRACE: InspectionInput = { kind: 'clearTrace' };

export const SWAP_ENDS: InspectionInput = { kind: 'swapEnds' };
