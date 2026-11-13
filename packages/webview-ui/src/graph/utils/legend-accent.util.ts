import type { AccentBox, SvgPart } from '../common/legend.type.ts';

/** The bar's thickness in viewBox units: the swatch is a 40 x 20 SVG drawn at 1:1, so 3 CSS px. */
const ACCENT_BAR_UNITS = 3;

/**
 * The top bar of a card swatch as a path in `colour`: inside the frame's stroke, `ACCENT_BAR_UNITS` tall, its top
 * corners following the frame's radius. A path, not a rect, so the frame stays the one rect of the swatch.
 */
export const accentBarPartOf = (box: AccentBox, strokePx: number, colour: string): SvgPart => {
  const inset = strokePx / 2;
  const left = box.x + inset;
  const right = box.x + box.width - inset;
  const top = box.y + inset;
  const bottom = top + ACCENT_BAR_UNITS;
  const radius = Math.max(box.rx - inset, 0);
  const corner = `A${radius} ${radius} 0 0 1`;
  const d = `M${left} ${bottom} V${top + radius} ${corner} ${left + radius} ${top} H${right - radius} ${corner} ${right} ${top + radius} V${bottom} Z`;
  const attrs = { d, fill: colour };
  const part: SvgPart = { tag: 'path', attrs, text: '' };

  return part;
};
