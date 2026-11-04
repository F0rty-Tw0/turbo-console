import { lineSegmentsOf } from './graph-geometry.spec.util.ts';
import type { ProbeEdgeLine } from '../../../src/graph/common/graph-probe.type.ts';
import type { ChipSpot, Rgb } from '../../common/graph-title-chip.type.ts';
import type { ElementRect, LinkEnds } from '../../common/playwright.type.ts';

/** How far a crossing keeps from both sides of the text, so the spot lies on the text and not on its edge. */
const SIDE_CLEAR_PX = 2;

/** The pixel row below the rect's top row that is read: the first row whose line is not cut by the rect's own top edge. */
const ROW_BELOW_TOP = 1;

const HEX_RADIX = 16;

const HEX_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

/**
 * Runs in the page through `evaluate`, so it reads only its argument: the rect of the element's first text node, the same
 * on a button that holds its text and on one that wraps it in a span.
 */
export const textRectOf = (element: Element): ElementRect => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode();

  if (node === null) throw new Error('graph e2e: the title holds no text');

  const range = document.createRange();

  range.selectNodeContents(node);

  const { top, left, width, height } = range.getBoundingClientRect();
  const rect: ElementRect = { top, left, width, height };

  return rect;
};

/** The x where `segment` meets the horizontal line `y`; `null` when the segment is level or stops short of it. */
const xAtY = (segment: LinkEnds, y: number): number | null => {
  const { from, to } = segment;

  if (from.y === to.y) return null;

  const along = (y - from.y) / (to.y - from.y);

  if (along < 0 || along > 1) return null;

  return from.x + along * (to.x - from.x);
};

/** The pixel row the spot reads, below the top of a text rect. */
const rowOf = (rect: ElementRect): number => Math.floor(rect.top) + ROW_BELOW_TOP;

/** The crossings of every drawn line with the middle of that row, left to right. */
const crossingsOf = (lines: ProbeEdgeLine[], row: number): number[] => {
  const middle = row + 0.5;
  const segments = lines.filter((line): boolean => line.isDrawn).flatMap(lineSegmentsOf);
  const crossings = segments.map((segment): number | null => xAtY(segment, middle));
  const found = crossings.filter((x): x is number => x !== null);

  return found.toSorted((first, second): number => first - second);
};

/** The spot where a drawn line crosses the text rect's second row, `SIDE_CLEAR_PX` clear of the text's sides; `null` when none does. */
export const spotUnderTextOf = (lines: ProbeEdgeLine[], rect: ElementRect): ChipSpot | null => {
  const row = rowOf(rect);
  const left = rect.left + SIDE_CLEAR_PX;
  const right = rect.left + rect.width - SIDE_CLEAR_PX;
  const isUnderText = (x: number): boolean => x >= left && x <= right;
  const x = crossingsOf(lines, row).find(isUnderText);

  if (x === undefined) return null;

  const spot: ChipSpot = { x: Math.floor(x), y: row };

  return spot;
};

/** Runs in the page: the colour of the single pixel of a base64 PNG clip. */
export const pixelOfPng = async (png: string): Promise<Rgb> => {
  const charCodeOf = (char: string): number => char.charCodeAt(0);
  const bytes = Uint8Array.from(atob(png), charCodeOf);
  const blob = new Blob([bytes], { type: 'image/png' });
  const image = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('No 2D context to decode the PNG');

  context.drawImage(image, 0, 0);

  const { data } = context.getImageData(0, 0, 1, 1);
  const pixel: Rgb = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];

  return pixel;
};

/** A stub's `#rrggbb` variable as its red, green and blue. */
export const rgbOfHex = (hex: string): Rgb => {
  const match = HEX_PATTERN.exec(hex);

  if (match === null) throw new Error(`graph e2e: ${hex} is not a #rrggbb colour`);

  const [, red = '0', green = '0', blue = '0'] = match;
  const rgb: Rgb = [parseInt(red, HEX_RADIX), parseInt(green, HEX_RADIX), parseInt(blue, HEX_RADIX)];

  return rgb;
};

/** The largest gap of any channel between two pixels. */
export const channelGapOf = (first: Rgb, second: Rgb): number => {
  const gaps = first.map((channel, index): number => Math.abs(channel - (second[index] ?? 0)));

  return Math.max(...gaps);
};
