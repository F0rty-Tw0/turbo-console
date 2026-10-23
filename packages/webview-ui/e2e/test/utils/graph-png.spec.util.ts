import type { PngInfo } from '../../common/graph.type.ts';

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
