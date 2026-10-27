import { NODE_HEIGHT } from '../common/graph.const.ts';
import type { LegendColour, LegendSwatch, SvgPart } from '../common/legend.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

type Attrs = Readonly<Record<string, string>>;

/** Every colour a swatch names, plus `label` and `selectionLabel` for its sample text. */
type Palette = Readonly<Record<LegendColour | 'label' | 'selectionLabel', string>>;

/** A swatch rect in viewBox units. */
type FrameBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx: number;
};

const BOX: FrameBox = { x: 3, y: 3, width: 34, height: 14, rx: 0 };

const PILL: FrameBox = { x: 3, y: 5, width: 34, height: 10, rx: 5 };

const NO_ATTRS: Attrs = {};

const LINE: Attrs = { x1: '2', y1: '10', x2: '34', y2: '10' };

const ARROW_HEAD = 'M38 10 L32 7 L32 13 Z';

const NESTED: Attrs = { x: '9', y: '7', width: '22', height: '6', rx: '3', 'stroke-width': '1' };

const PLATE: Attrs = { x: '14', y: '6', width: '12', height: '8' };

const SAMPLE: Attrs = { x: '20', y: '14', 'text-anchor': 'middle', 'font-size': '9' };

const PLATE_TEXT: Attrs = { x: '20', y: '13', 'text-anchor': 'middle', 'font-size': '8' };

const partOf = (tag: SvgPart['tag'], attrs: Attrs, text = ''): SvgPart => {
  const part: SvgPart = { tag, attrs, text };

  return part;
};

const paletteOf = (colors: ThemeColors): Palette => {
  const selectionFill = colors.selection?.fill ?? colors.background;
  const selectionLabel = colors.selection?.label ?? colors.label;
  const { runs } = colors;
  const palette: Palette = {
    frame: colors.frame,
    background: colors.background,
    edge: colors.edge,
    selected: colors.selected,
    highlighted: colors.highlighted,
    cached: colors.cached,
    label: colors.label,
    selectionFill,
    selectionLabel,
    'run-running': runs.running,
    'run-passed': runs.passed,
    'run-failed': runs.failed,
    'run-stopped': runs.stopped,
    'run-failed-to-start': runs['failed-to-start']
  };

  return palette;
};

const dashOf = (dashPx: number[] | null): Attrs => {
  if (dashPx === null) return NO_ATTRS;

  const dash: Attrs = { 'stroke-dasharray': dashPx.join(' ') };

  return dash;
};

const boxOf = (swatch: LegendSwatch): FrameBox => {
  if (swatch.shape === 'pill') return PILL;

  const rx = (swatch.radiusPx * BOX.height) / NODE_HEIGHT;
  const box: FrameBox = { ...BOX, rx };

  return box;
};

const placeOf = (box: FrameBox): Attrs => {
  const place: Attrs = {
    x: String(box.x),
    y: String(box.y),
    width: String(box.width),
    height: String(box.height),
    rx: String(box.rx)
  };

  return place;
};

/** `box` grown by `by` on each side, corners included. */
const grownOf = (box: FrameBox, by: number): FrameBox => {
  const grown: FrameBox = { x: box.x - by, y: box.y - by, width: box.width + 2 * by, height: box.height + 2 * by, rx: box.rx + by };

  return grown;
};

/** The outline drawn around the frame, outside its stroke, as the stylesheet's `outline` is. */
const outlinePartsOf = (swatch: LegendSwatch, box: FrameBox, palette: Palette): SvgPart[] => {
  if (swatch.outline === null) return [];

  const grown = grownOf(box, (swatch.strokePx + swatch.outline.px) / 2);
  const place = placeOf(grown);
  const attrs: Attrs = { ...place, fill: 'none', stroke: palette[swatch.outline.colour], 'stroke-width': String(swatch.outline.px) };

  return [partOf('rect', attrs)];
};

/** The nested folder box, or the sample text in its weight. */
const innerPartOf = (swatch: LegendSwatch, palette: Palette): SvgPart => {
  if (swatch.isNested) return partOf('rect', { ...NESTED, stroke: palette.frame, fill: palette.background });

  const weight = swatch.isBold ? 'bold' : 'normal';
  const fill = swatch.fill === 'selectionFill' ? palette.selectionLabel : palette.label;
  const attrs: Attrs = { ...SAMPLE, fill, 'font-weight': weight };

  return partOf('text', attrs, 'Aa');
};

const boxPartsOf = (swatch: LegendSwatch, palette: Palette): SvgPart[] => {
  const box = boxOf(swatch);
  const outline = outlinePartsOf(swatch, box, palette);
  const place = placeOf(box);
  const dash = dashOf(swatch.dashPx);
  const fill = swatch.fill === null ? 'none' : palette[swatch.fill];
  const attrs: Attrs = { ...place, stroke: palette[swatch.stroke], 'stroke-width': String(swatch.strokePx), fill, ...dash };
  const frame = partOf('rect', attrs);
  const inner = innerPartOf(swatch, palette);

  return [...outline, frame, inner];
};

const lineOf = (stroke: string, widthPx: number, dash: Attrs): SvgPart => {
  const attrs: Attrs = { ...LINE, stroke, 'stroke-width': String(widthPx), ...dash };

  return partOf('line', attrs);
};

/** The flow's highlighted line, then its dash pen in the pen colour over it. */
const flowPartsOf = (swatch: LegendSwatch, palette: Palette): SvgPart[] => {
  const line = lineOf(palette[swatch.stroke], swatch.strokePx, NO_ATTRS);

  if (swatch.outline === null) return [line];

  const dash = dashOf(swatch.dashPx);
  const pen = lineOf(palette[swatch.outline.colour], swatch.outline.px, dash);

  return [line, pen];
};

/** A link: the line, its arrow head at the target, the "<n> links" plate. */
const linePartsOf = (swatch: LegendSwatch, palette: Palette): SvgPart[] => {
  const stroke = palette[swatch.stroke];
  const dash = dashOf(swatch.dashPx);
  const line = lineOf(stroke, swatch.strokePx, dash);
  const head = partOf('path', { d: ARROW_HEAD, fill: stroke });
  const plate = partOf('rect', { ...PLATE, fill: palette.background });
  const plateText = partOf('text', { ...PLATE_TEXT, fill: palette.label }, 'n');
  const parts: SvgPart[] = [line];

  if (swatch.isArrow) parts.push(head);

  if (swatch.hasPlate) parts.push(plate, plateText);

  return parts;
};

const shapePartsOf = (swatch: LegendSwatch, palette: Palette): SvgPart[] => {
  if (swatch.shape === 'flow') return flowPartsOf(swatch, palette);

  if (swatch.shape === 'line') return linePartsOf(swatch, palette);

  return boxPartsOf(swatch, palette);
};

/** The SVG parts of one legend swatch in a 40 x 20 viewBox, in `colors`; a dimmed swatch fades every part. */
export const swatchPartsOf = (swatch: LegendSwatch, colors: ThemeColors): SvgPart[] => {
  const palette = paletteOf(colors);
  const parts = shapePartsOf(swatch, palette);

  if (!swatch.isDimmed) return parts;

  const opacity = String(colors.dimmedOpacity);
  const dimmedOf = (part: SvgPart): SvgPart => partOf(part.tag, { ...part.attrs, opacity }, part.text);

  return parts.map(dimmedOf);
};
