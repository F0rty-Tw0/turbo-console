import { channelGapOf } from './graph-title-chip.spec.util.ts';
import type { Rgb } from '../../common/graph-title-chip.type.ts';
import type { ScreenClip, ViewportPoint } from '../../common/playwright.type.ts';

/** Runs in the page: every pixel of a base64 PNG clip, row by row. */
export const pixelsOfPng = async (png: string): Promise<Rgb[]> => {
  const charCodeOf = (char: string): number => char.charCodeAt(0);
  const bytes = Uint8Array.from(atob(png), charCodeOf);
  const blob = new Blob([bytes], { type: 'image/png' });
  const image = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('No 2D context to decode the PNG');

  context.drawImage(image, 0, 0);

  const { data } = context.getImageData(0, 0, image.width, image.height);
  const count = image.width * image.height;
  const pixelAt = (_: unknown, index: number): Rgb => {
    const start = index * 4;
    const pixel: Rgb = [data[start] ?? 0, data[start + 1] ?? 0, data[start + 2] ?? 0];

    return pixel;
  };

  return Array.from({ length: count }, pixelAt);
};

/** The square of whole page pixels `radius` px around `point`, as `page.screenshot` clips it. */
export const clipAround = (point: ViewportPoint, radius: number): ScreenClip => {
  const side = radius * 2 + 1;
  const clip: ScreenClip = { x: Math.round(point.x) - radius, y: Math.round(point.y) - radius, width: side, height: side };

  return clip;
};

/**
 * How far the inkiest pixel has moved from the box `fill` toward the `edge` colour: 0 when every pixel is the fill, 1
 * when one is the edge colour. A thin line is anti-aliased, so its pixels sit part of the way.
 */
export const inkTowardOf = (pixels: Rgb[], fill: Rgb, edge: Rgb): number => {
  const span = channelGapOf(fill, edge);
  const shareOf = (pixel: Rgb): number => 1 - channelGapOf(pixel, edge) / span;
  const shares = pixels.map(shareOf);

  return Math.max(0, ...shares);
};
