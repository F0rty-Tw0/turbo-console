import type { SameHashPlan } from '../common/graph-inspection.type.ts';
import type { Inspection, InspectionInput } from '../common/inspection.type.ts';

/**
 * What a list Focus toggle does to the inspection: a new focus selects that package, without a camera move; while
 * picking, or when the focus is cleared, nothing (the panel's Focus label still follows).
 */
export const focusInputOf = (current: Inspection, name: string | null): InspectionInput | null => {
  if (name === null || current.kind === 'picking') return null;

  const input: InspectionInput = { kind: 'select', name, via: 'canvas' };

  return input;
};

/** The camera moves only for a package chosen off the canvas that became the inspected package (spec §4.3, D23). */
export const shouldPan = (input: InspectionInput, next: Inspection): boolean => {
  const isOffCanvas = input.kind === 'select' && input.via !== 'canvas';

  return isOffCanvas && next.kind === 'package';
};

/** A same-hash state relabels a shown package whose task counts changed, and asks again for a shown link's entry. */
export const sameHashPlanOf = (current: Inspection, isChanged: boolean): SameHashPlan => {
  const isUpdate = current.kind === 'package' && isChanged;
  const isReask = current.kind === 'link';
  const plan: SameHashPlan = { isUpdate, isReask };

  return plan;
};
