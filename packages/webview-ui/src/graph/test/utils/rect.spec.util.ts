import type { RectPx } from '../../common/widget.type.ts';

/** A rect from its corners, `{x1, y1, x2, y2}`. */
export const rectOf = (x1: number, y1: number, x2: number, y2: number): RectPx => {
  const rect: RectPx = { x1, y1, x2, y2 };

  return rect;
};
