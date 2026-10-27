import type { Rgba } from '../common/theme-colors.type.ts';

const HEX = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu;

const RGB_FUNCTION = /^rgba?\(([^)]*)\)$/iu;

/** A hex colour's channels, 0 to 255: three for `#rgb` and `#rrggbb`, four with an alpha digit pair or digit. */
export const hexChannelsOf = (hex: string): number[] => {
  const digits = hex.slice(1);
  const width = digits.length > 4 ? 2 : 1;
  const count = digits.length / width;
  const channelOf = (index: number): number => {
    const part = digits.slice(index * width, (index + 1) * width);
    const full = width === 1 ? `${part}${part}` : part;

    return Number.parseInt(full, 16);
  };

  return Array.from({ length: count }, (_, index: number): number => channelOf(index));
};

const rgbaFrom = (bytes: number[], alpha: number): Rgba => {
  const [red = 0, green = 0, blue = 0] = bytes;
  const rgba: Rgba = [red / 255, green / 255, blue / 255, alpha];

  return rgba;
};

/** `rgb(r, g, b)` or `rgba(r, g, b, a)` with plain numbers; `null` for any other shape. */
const functionRgbaOf = (body: string): Rgba | null => {
  const texts = body.split(',');
  const isNumberText = (text: string): boolean => text.trim() !== '' && Number.isFinite(Number(text));
  const hasThreeOrFour = texts.length === 3 || texts.length === 4;
  const isWellFormed = hasThreeOrFour && texts.every(isNumberText);

  if (!isWellFormed) return null;

  const [red = 0, green = 0, blue = 0, alpha = 1] = texts.map(Number);

  return rgbaFrom([red, green, blue], alpha);
};

export const rgbaOf = (colour: string): Rgba | null => {
  const trimmed = colour.trim();
  const match = RGB_FUNCTION.exec(trimmed);
  const body = match?.[1];
  const isHex = HEX.test(trimmed);

  if (body !== undefined) return functionRgbaOf(body);

  if (!isHex) return null;

  const [red = 0, green = 0, blue = 0, alpha = 255] = hexChannelsOf(trimmed);

  return rgbaFrom([red, green, blue], alpha / 255);
};

export const isRgba = (value: Rgba | null): value is Rgba => value !== null;
