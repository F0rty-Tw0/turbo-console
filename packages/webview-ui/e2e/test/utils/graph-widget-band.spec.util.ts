import type { ElementRect } from '../../common/playwright.type.ts';

/** The height of a box's header band in graph px: its top 32 px, drawn at the camera zoom. */
const BAND_PX = 32;

/** Half the widest collapsed-node title in graph px (`COLLAPSED_LABEL_MAX_PX`), centred on the node. */
const HALF_LABEL_PX = 58;

/** How far a button may reach past where it should lie, in CSS pixels. */
const BAND_TOLERANCE_PX = 0.5;

/** Each button whose top or bottom leaves the box's band as drawn at `zoom`. */
export const bandFaultsOf = (box: ElementRect, buttons: ElementRect[], zoom: number): string[] => {
  const bandBottom = box.top + BAND_PX * zoom;
  const isOutside = (button: ElementRect): boolean => {
    const isAbove = button.top < box.top - BAND_TOLERANCE_PX;
    const isBelow = button.top + button.height > bandBottom + BAND_TOLERANCE_PX;

    return isAbove || isBelow;
  };
  const outside = buttons.filter(isOutside);

  const faultOf = (button: ElementRect): string => {
    const bottom = button.top + button.height;

    return `button at ${button.top.toFixed(1)}..${bottom.toFixed(1)} leaves the band ${box.top.toFixed(1)}..${bandBottom.toFixed(1)}`;
  };

  return outside.map(faultOf);
};

/** Each button that meets the widest label a collapsed node can draw, centred on the node at `zoom`. */
export const labelFaultsOf = (node: ElementRect, buttons: ElementRect[], zoom: number): string[] => {
  const centre = node.left + node.width / 2;
  const labelLeft = centre - HALF_LABEL_PX * zoom;
  const labelRight = centre + HALF_LABEL_PX * zoom;
  const meetsLabel = (button: ElementRect): boolean => {
    const isLeftOf = button.left + button.width <= labelLeft;
    const isRightOf = button.left >= labelRight;

    return !isLeftOf && !isRightOf;
  };
  const meeting = buttons.filter(meetsLabel);

  return meeting.map(
    (button): string => `button at ${button.left.toFixed(1)} meets the label ${labelLeft.toFixed(1)}..${labelRight.toFixed(1)}`
  );
};
