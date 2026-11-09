import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { isTitleSlotId } from './task-compound.util.ts';
import type { BoxFrame, BoxFrames } from '../common/layout.type.ts';

type FrameEntry = [string, BoxFrame];

type Rect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

/** `node`'s rectangle in the root's frame, its parent's corner sitting at `(originX, originY)`. */
const rectOf = (node: ElkNode, originX: number, originY: number): Rect => {
  const { x = 0, y = 0, width = 0, height = 0 } = node;
  const rect: Rect = { x: originX + x, y: originY + y, width, height };

  return rect;
};

/** The frame of `box` when it holds a title slot and one other child (its task); else no entry. */
const frameEntryOf = (node: ElkNode, box: Rect): FrameEntry[] => {
  const children = node.children ?? [];
  const slot = children.find((child) => isTitleSlotId(child.id));
  const leaf = children.find((child) => !isTitleSlotId(child.id));

  if (slot === undefined || leaf === undefined) return [];

  const task = rectOf(leaf, box.x, box.y);
  const title = rectOf(slot, box.x, box.y);
  const centreX = task.x + task.width / 2;
  const centreY = task.y + task.height / 2;
  const frame: BoxFrame = {
    leafId: leaf.id,
    left: box.x - centreX,
    right: box.x + box.width - centreX,
    top: box.y - centreY,
    bottom: box.y + box.height - centreY,
    titleX: title.x - centreX,
    titleY: title.y - centreY
  };

  return [[node.id, frame]];
};

/** The entries of every titled-row box under `node`, whose parent's corner sits at `(originX, originY)`. */
const entriesUnder = (node: ElkNode, originX: number, originY: number): FrameEntry[] => {
  const box = rectOf(node, originX, originY);
  const children = node.children ?? [];
  const own = frameEntryOf(node, box);
  const below = children.flatMap((child) => entriesUnder(child, box.x, box.y));

  return [...own, ...below];
};

/**
 * The frame of every titled-row box (a compound holding a title slot) of a laid-out graph, by box id, relative to the
 * centre of the box's task. Package graphs hold no slot, so give none.
 */
export const boxFramesOf = (laidOut: ElkNode): BoxFrames => {
  const entries = entriesUnder(laidOut, 0, 0);

  return Object.fromEntries(entries);
};
