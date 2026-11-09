import type { BoxFrame } from '../common/layout.type.ts';

const FRAME_NUMBERS = ['left', 'right', 'top', 'bottom', 'titleX', 'titleY'] as const;

/** Whether `value` is a `BoxFrame`, as a box's `boxFrame` data reads back from Cytoscape, which types data as `any`. */
export const isBoxFrame = (value: unknown): value is BoxFrame => {
  const isRecord = typeof value === 'object' && value !== null;

  if (!isRecord) return false;

  const fields = new Map(Object.entries(value));
  const isNumberField = (key: string): boolean => typeof fields.get(key) === 'number';
  const hasLeaf = typeof fields.get('leafId') === 'string';

  return hasLeaf && FRAME_NUMBERS.every(isNumberField);
};
