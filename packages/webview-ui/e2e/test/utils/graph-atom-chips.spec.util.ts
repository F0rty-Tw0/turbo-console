import type { ChipRowMargins } from '../../common/graph-atom-chips.type.ts';
import type { ElementRect } from '../../common/playwright.type.ts';

/** How far each side of `inner` sits inside the umbrella `box`, the top measured from the box's centre, the top of its counts band. */
export const chipRowMarginsOf = (inner: ElementRect, box: ElementRect): ChipRowMargins => {
  const centreY = box.top + box.height / 2;
  const margins: ChipRowMargins = {
    left: inner.left - box.left,
    right: box.left + box.width - (inner.left + inner.width),
    top: inner.top - centreY,
    bottom: box.top + box.height - (inner.top + inner.height)
  };

  return margins;
};
