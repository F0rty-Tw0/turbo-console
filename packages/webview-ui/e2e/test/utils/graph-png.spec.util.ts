import type { ColourInkInput, PngInfo, TitleBandInk } from '../../common/graph.type.ts';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const IHDR_WIDTH_OFFSET = 16;

const IHDR_HEIGHT_OFFSET = 20;

const IHDR_END = 24;

const NOT_PNG: PngInfo = { isPng: false, width: 0, height: 0 };

/** Reads a base64 image's header: the 8-byte PNG signature, then the IHDR width and height as big-endian u32 at bytes 16 and 20. */
export const pngInfoOf = (base64: string): PngInfo => {
  const bytes = Buffer.from(base64, 'base64');
  const isSigned = PNG_SIGNATURE.every((byte: number, index: number): boolean => bytes[index] === byte);
  const isPng = isSigned && bytes.length >= IHDR_END;

  if (!isPng) return NOT_PNG;

  const width = bytes.readUInt32BE(IHDR_WIDTH_OFFSET);
  const height = bytes.readUInt32BE(IHDR_HEIGHT_OFFSET);
  const info: PngInfo = { isPng, width, height };

  return info;
};

/**
 * Runs in the page: decodes a base64 PNG exported at scale 2 and counts its ink, pixels 64 or more off the top-left
 * background in some channel, in rows 8 to 55 of the 64 px top padding band of a box at the image top; `nearSides`
 * counts the ink within 32 px of the left or right edge, `inside` the rest.
 */
export const titleBandInkOf = async (png: string): Promise<TitleBandInk> => {
  const BAND_TOP = 8;
  const BAND_END = 56;
  const SIDE_PX = 32;
  const INK_DIFF = 64;
  const CHANNELS = [0, 1, 2];
  const charCodeOf = (char: string): number => char.charCodeAt(0);
  const bytes = Uint8Array.from(atob(png), charCodeOf);
  const blob = new Blob([bytes], { type: 'image/png' });
  const image = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('No 2D context to decode the PNG');

  context.drawImage(image, 0, 0);

  const { data, width } = context.getImageData(0, 0, image.width, BAND_END);
  const columns = Array.from({ length: width }, (_, x: number): number => x);
  const rows = Array.from({ length: BAND_END - BAND_TOP }, (_, index: number): number => BAND_TOP + index);
  const channelOff = (offset: number, channel: number): boolean =>
    Math.abs((data[offset + channel] ?? 0) - (data[channel] ?? 0)) >= INK_DIFF;
  const isInk = (x: number, y: number): boolean => {
    const offset = (y * width + x) * 4;

    return CHANNELS.some((channel: number): boolean => channelOff(offset, channel));
  };
  const inkOfRow = (y: number): number[] => columns.filter((x: number): boolean => isInk(x, y));
  const inkColumns = rows.flatMap(inkOfRow);
  const isNearSide = (x: number): boolean => x < SIDE_PX || x >= width - SIDE_PX;
  const nearSides = inkColumns.filter(isNearSide).length;
  const ink: TitleBandInk = { inside: inkColumns.length - nearSides, nearSides };

  return ink;
};

/**
 * Runs in the page: decodes a base64 PNG and counts its pixels within `tolerance` (24 by default) of `colour` in every
 * channel. Anti-aliased lines of a lighter colour fade toward the background, so they never come that close to a darker
 * label colour.
 */
export const colourInkOf = async ({ png, colour, tolerance = 24 }: ColourInkInput): Promise<number> => {
  const CHANNELS = [0, 1, 2];
  const channelTexts = colour.match(/\d+/g) ?? [];
  const rgb = channelTexts.map(Number);
  const charCodeOf = (char: string): number => char.charCodeAt(0);
  const bytes = Uint8Array.from(atob(png), charCodeOf);
  const blob = new Blob([bytes], { type: 'image/png' });
  const image = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (context === null) throw new Error('No 2D context to decode the PNG');

  context.drawImage(image, 0, 0);

  const { data } = context.getImageData(0, 0, image.width, image.height);
  const pixels = Array.from({ length: data.length / 4 }, (_, index: number): number => index * 4);
  const isNear = (offset: number, channel: number): boolean =>
    Math.abs((data[offset + channel] ?? 0) - (rgb[channel] ?? 0)) <= tolerance;
  const isInk = (offset: number): boolean => CHANNELS.every((channel: number): boolean => isNear(offset, channel));

  return pixels.filter(isInk).length;
};
