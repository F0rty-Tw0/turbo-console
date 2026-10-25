import type { ElementRect } from '../../common/playwright.type.ts';

/** Runs in the page through `evaluate`, so it reads only its argument; a DOMRect serializes to `{}`, so the fields are copied. */
export const readRect = (element: Element): ElementRect => {
  const { top, left, width, height } = element.getBoundingClientRect();
  const rect: ElementRect = { top, left, width, height };

  return rect;
};

/**
 * Runs in the page through `evaluateAll`: the rects of every match, with no per-match wait. A count followed by per-match
 * reads can wait forever when a match hides between them, since an `nth` locator then matches nothing. Only its own
 * source reaches the page, so it repeats `readRect`'s body rather than calling it.
 */
export const readRects = (elements: Element[]): ElementRect[] => {
  const rects = elements.map((element): ElementRect => {
    const { top, left, width, height } = element.getBoundingClientRect();
    const rect: ElementRect = { top, left, width, height };

    return rect;
  });

  return rects;
};

/** `inner` lies wholly inside `outer`, edges included. */
export const isInside = (inner: ElementRect, outer: ElementRect): boolean => {
  const fitsAcross = inner.left >= outer.left && inner.left + inner.width <= outer.left + outer.width;
  const fitsDown = inner.top >= outer.top && inner.top + inner.height <= outer.top + outer.height;

  return fitsAcross && fitsDown;
};

/** The two boxes share some area; boxes that only touch at an edge don't overlap. */
export const overlaps = (first: ElementRect, second: ElementRect): boolean => {
  const crossesAcross = first.left < second.left + second.width && second.left < first.left + first.width;
  const crossesDown = first.top < second.top + second.height && second.top < first.top + first.height;

  return crossesAcross && crossesDown;
};
