import type { Inspection, PlainInputKind } from './inspection.type.ts';

export const NO_INSPECTION: Inspection = { kind: 'none' };

/** Every `PlainInputKind` as a key, so a kind added to the union and missed here fails to compile. */
const PLAIN_KINDS: Record<PlainInputKind, true> = {
  background: true,
  clear: true,
  startTrace: true,
  cancel: true,
  clearTrace: true,
  swapEnds: true
};

/** The input kinds that carry nothing beyond their kind. */
export const PLAIN_INPUT_KINDS: ReadonlySet<string> = new Set(Object.keys(PLAIN_KINDS));
