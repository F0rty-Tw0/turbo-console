import { nextInspection } from './inspection.util.ts';
import type { InputPlan, SameHashPlan } from '../common/graph-inspection.type.ts';
import type { Inspection, InspectionInput } from '../common/inspection.type.ts';

/**
 * What a list Focus toggle does to the inspection: a new focus selects that package, without a camera move; while
 * picking, or when the focus is cleared, nothing (the panel's Focus label still follows).
 */
export const focusInputOf = (current: Inspection, name: string | null): InspectionInput | null => {
  if (name === null || current.kind === 'picking') return null;

  const input: InspectionInput = { kind: 'select', name, via: 'focus' };

  return input;
};

/** The camera moves only for a package chosen in the list or the panel that became the inspected package (spec §4.3, D23). */
export const shouldPan = (input: InspectionInput, next: Inspection): boolean => {
  const isChosen = input.kind === 'select' && input.via !== 'canvas' && input.via !== 'focus';

  return isChosen && next.kind === 'package';
};

/**
 * What an input does: the next inspection, the package the camera centres (`null` for none), and whether the
 * keep-clear pan follows: only when the rules changed the inspection, so a no-op such as Escape in the panel never
 * pans. A select always builds a new inspection, so a tap on the inspected package still keeps it clear.
 */
export const inputPlanOf = (current: Inspection, input: InspectionInput): InputPlan => {
  const next = nextInspection(current, input);
  const isPan = shouldPan(input, next);
  const centre = isPan && next.kind === 'package' ? next.name : null;
  const isKeepClear = next !== current;
  const plan: InputPlan = { next, centre, isKeepClear };

  return plan;
};

/** A same-hash state relabels a shown package whose task counts changed, and asks again for a shown link's entry. */
export const sameHashPlanOf = (current: Inspection, isChanged: boolean): SameHashPlan => {
  const isUpdate = current.kind === 'package' && isChanged;
  const reask = current.kind === 'link' ? current : null;
  const plan: SameHashPlan = { isUpdate, reask };

  return plan;
};
