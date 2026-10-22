import { DETAILS_WIDTH_PX } from '../../common/graph.const.ts';
import type { ElementRect } from '../../common/playwright.type.ts';

const EDGE_TOLERANCE_PX = 1;

const rightOf = (rect: ElementRect): number => rect.left + rect.width;

const isDetailsWide = (aside: ElementRect): boolean => Math.abs(aside.width - DETAILS_WIDTH_PX) <= EDGE_TOLERANCE_PX;

/** Runs in the page through `evaluate`: the right edge of the body. */
export const readBodyRight = (): number => document.body.getBoundingClientRect().right;

/** Runs in the page through `evaluate`: the element's content is wider than its box, so it scrolls sideways. */
export const hasSideScroll = (element: Element): boolean => element.scrollWidth > element.clientWidth;

/** The aside is 280 px wide, flush with the body's right edge, and starts left of the container's right edge. */
export const isOverlaid = (aside: ElementRect, container: ElementRect, bodyRight: number): boolean => {
  const isFlushRight = Math.abs(rightOf(aside) - bodyRight) <= EDGE_TOLERANCE_PX;
  const isOverCanvas = aside.left < rightOf(container);

  return isDetailsWide(aside) && isFlushRight && isOverCanvas;
};

/** The aside is 280 px wide and the container ends at or left of where it starts. */
export const isDocked = (aside: ElementRect, container: ElementRect): boolean => {
  const isBeside = rightOf(container) <= aside.left + EDGE_TOLERANCE_PX;

  return isDetailsWide(aside) && isBeside;
};
