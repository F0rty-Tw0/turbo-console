import type { Inspection } from './inspection.type.ts';

export const NO_INSPECTION: Inspection = { kind: 'none' };

/** The input kinds that carry nothing beyond their kind. */
export const PLAIN_INPUT_KINDS: ReadonlySet<string> = new Set([
  'background',
  'clear',
  'startTrace',
  'cancel',
  'clearTrace',
  'swapEnds'
]);
