import type { BoundingBox12, Core, NodeSingular } from 'cytoscape';

import { BOX_FRAMED_CLASS } from '../common/graph-task.const.ts';
import { FOLDER_PADDING_PX, NODE_FONT_SIZE } from '../common/graph.const.ts';
import type { BoxFrame, BoxFrames } from '../common/layout.type.ts';
import { isBoxFrame } from '../utils/box-frame.util.ts';

const CHILD_OPTIONS = { includeLabels: true, includeOverlays: false };

/**
 * The data that draws `box` on `frame`, whose sides ELK measured from its task's body:
 * - the padding, 32 px less how far the children's bounds reach past the task's body (half its border and Cytoscape's
 *   1 px antialiasing margin), so a side with no extra lands on the frame and not 1.5 px outside it
 * - per side, the extra past the children's bounds and that padding that reaches the frame, 0 when the children already
 *   reach past it
 * - the title margins: Cytoscape starts a `left-inside` label two paddings in from the frame and ends a `top` label at
 *   the frame's top, so these put the label's top-left corner on the placeholder's
 */
const frameDataOf = (box: NodeSingular, leaf: NodeSingular, frame: BoxFrame): Record<string, unknown> => {
  const bounds: BoundingBox12 = box.children().boundingBox(CHILD_OPTIONS);
  const { x, y } = leaf.position();
  const bodyLeft = x - leaf.width() / 2;
  const overhang = Math.max(0, bodyLeft - bounds.x1);
  const pad = FOLDER_PADDING_PX - overhang;
  const extraLeft = Math.max(0, bounds.x1 - pad - (x + frame.left));
  const extraRight = Math.max(0, x + frame.right - pad - bounds.x2);
  const extraTop = Math.max(0, bounds.y1 - pad - (y + frame.top));
  const extraBottom = Math.max(0, y + frame.bottom - pad - bounds.y2);
  const titleLeft = frame.titleX - frame.left;
  const titleTop = frame.titleY - frame.top;
  const data = {
    boxFrame: frame,
    framePadding: pad,
    frameMinWidth: bounds.x2 - bounds.x1 + extraLeft + extraRight,
    frameMinHeight: bounds.y2 - bounds.y1 + extraTop + extraBottom,
    frameLeft: extraLeft,
    frameRight: extraRight,
    frameTop: extraTop,
    frameBottom: extraBottom,
    frameTitleX: titleLeft - 2 * pad,
    frameTitleY: titleTop + NODE_FONT_SIZE
  };

  return data;
};

/**
 * Draws each titled-row box of `boxFrames` on its ELK frame: writes the frame data on the box and adds `box-framed`. A
 * frame whose box or task is not drawn is skipped.
 */
export const applyBoxFrames = (cy: Core, boxFrames: BoxFrames): void => {
  const frameBox = ([boxId, frame]: [string, BoxFrame]): void => {
    const box = cy.getElementById(boxId);
    const leaf = cy.getElementById(frame.leafId);
    const isBoxGone = box.empty();
    const isLeafGone = leaf.empty();
    const isUndrawn = isBoxGone || isLeafGone;

    if (isUndrawn) return;

    const data = frameDataOf(box, leaf, frame);

    box.data(data);
    box.addClass(BOX_FRAMED_CLASS);
  };
  const entries = Object.entries(boxFrames);

  cy.batch((): void => void entries.forEach(frameBox));
};

/** Whether `box` carries a frame, so its class may come and go while the data stays. */
const hasFrame = (box: NodeSingular): boolean => {
  const value: unknown = box.data('boxFrame');

  return isBoxFrame(value);
};

/** Whether `box` already carries each value of `data`; its frame is the same object, since it was read from the box. */
const isDataKept = (box: NodeSingular, data: Record<string, unknown>): boolean => {
  const isKept = ([key, value]: [string, unknown]): boolean => box.data(key) === value;
  const entries = Object.entries(data);

  return entries.every(isKept);
};

/**
 * Writes the frame data of `box` again from where its children are drawn now; a box without a frame or task is left,
 * and so is one whose data is unchanged, since a write dirties its style and bounds even then.
 */
const refitBox = (box: NodeSingular): void => {
  const frame: unknown = box.data('boxFrame');
  const isFramed = isBoxFrame(frame);

  if (!isFramed) return;

  const leaf = box.cy().getElementById(frame.leafId);
  const isLeafGone = leaf.empty();

  if (isLeafGone) return;

  const data = frameDataOf(box, leaf, frame);
  const isKept = isDataKept(box, data);

  if (!isKept) box.data(data);
};

/**
 * Writes the frame data of each framed box again after its task's classes changed: in a browser Cytoscape counts a
 * task's outline in its bounds, so a run outline of 2 px would otherwise move the box 2 px off its frame.
 */
export const refitBoxFrames = (cy: Core): void => {
  const framed = cy.nodes(`.${BOX_FRAMED_CLASS}`);

  cy.batch((): void => void framed.forEach(refitBox));
};

/** Drops `box-framed` from a framed box, so it draws from its children until `reframeBox`; its frame data stays. */
export const unframeBox = (box: NodeSingular): void => {
  const isFramed = hasFrame(box);

  if (isFramed) box.removeClass(BOX_FRAMED_CLASS);
};

/**
 * Puts `box-framed` back on a box that carries a frame, its frame data written again since its task's outline may have
 * changed while it was unframed; a box without one stays unframed.
 */
export const reframeBox = (box: NodeSingular): void => {
  const isFramed = hasFrame(box);

  if (!isFramed) return;

  refitBox(box);
  box.addClass(BOX_FRAMED_CLASS);
};
