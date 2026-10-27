import type { SvgPart } from '../common/legend.type.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

const svgPartOf = (part: SvgPart): SVGElement => {
  const element = document.createElementNS(SVG_NS, part.tag);
  const attrs = Object.entries(part.attrs);

  // eslint-disable-next-line no-restricted-syntax -- the names are swatchPartsOf's fixed geometry keys, never page data
  for (const [name, value] of attrs) element.setAttribute(name, value);

  element.textContent = part.text;

  return element;
};

/** A 40 x 20 swatch of `parts` at `opacity`, hidden from assistive tech: the row's term already says what it shows. */
export const legendSvgOf = (parts: SvgPart[], opacity: number): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const children = parts.map(svgPartOf);

  svg.setAttribute('viewBox', '0 0 40 20');
  svg.setAttribute('width', '40');
  svg.setAttribute('height', '20');
  svg.setAttribute('opacity', String(opacity));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.append(...children);

  return svg;
};
