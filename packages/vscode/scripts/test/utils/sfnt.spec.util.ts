const DIRECTORY_START = 12;
const DIRECTORY_RECORD = 16;
const HEAD_UNITS_PER_EM = 18;
const HEAD_CREATED = 20;
const HEAD_MODIFIED = 28;
const HEAD_LOCA_FORMAT = 50;
const MAXP_NUM_GLYPHS = 4;
const GLYPH_X_MAX = 6;
const GLYPH_Y_MAX = 8;
const SEGMENT_END_CODES = 14;
const FORMAT_4 = 4;
const UINT16_RANGE = 0x10000;
const TAG_OFFSETS = [0, 1, 2, 3];

export const viewOf = (bytes: Uint8Array): DataView => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const tagAt = (view: DataView, offset: number): string => {
  const codes = TAG_OFFSETS.map((index) => view.getUint8(offset + index));

  return String.fromCharCode(...codes);
};

/** The byte offset of the table named `tag` in the directory. */
const tableOffsetOf = (view: DataView, tag: string): number => {
  const count = view.getUint16(4);

  for (let index = 0; index < count; index += 1) {
    const record = DIRECTORY_START + index * DIRECTORY_RECORD;

    const found = tagAt(view, record);

    if (found === tag) return view.getUint32(record + 8);
  }

  throw new Error(`the font has no ${tag} table`);
};

export const unitsPerEmOf = (view: DataView): number => view.getUint16(tableOffsetOf(view, 'head') + HEAD_UNITS_PER_EM);

/** Seconds since 1904-01-01 (LONGDATETIME). */
export const createdOf = (view: DataView): bigint => view.getBigInt64(tableOffsetOf(view, 'head') + HEAD_CREATED);

export const modifiedOf = (view: DataView): bigint => view.getBigInt64(tableOffsetOf(view, 'head') + HEAD_MODIFIED);

export const numGlyphsOf = (view: DataView): number => view.getUint16(tableOffsetOf(view, 'maxp') + MAXP_NUM_GLYPHS);

/** The first encoding record whose subtable is format 4. */
const format4TableOf = (view: DataView): number => {
  const cmap = tableOffsetOf(view, 'cmap');
  const count = view.getUint16(cmap + 2);

  for (let index = 0; index < count; index += 1) {
    const subtable = cmap + view.getUint32(cmap + 4 + index * 8 + 4);

    const format = view.getUint16(subtable);

    if (format === FORMAT_4) return subtable;
  }

  throw new Error('the font has no format 4 cmap subtable');
};

/** The glyph id of `code` through the cmap format 4 `idRangeOffset` lookup; 0 when unmapped. */
export const glyphIdOf = (view: DataView, code: number): number => {
  const subtable = format4TableOf(view);
  const segments = view.getUint16(subtable + 6) / 2;
  const endCodes = subtable + SEGMENT_END_CODES;
  const startCodes = endCodes + segments * 2 + 2;
  const idDeltas = startCodes + segments * 2;
  const idRangeOffsets = idDeltas + segments * 2;

  for (let segment = 0; segment < segments; segment += 1) {
    const end = view.getUint16(endCodes + segment * 2);

    if (end < code) continue;

    const start = view.getUint16(startCodes + segment * 2);
    const delta = view.getUint16(idDeltas + segment * 2);
    const rangeOffsetAt = idRangeOffsets + segment * 2;
    const rangeOffset = view.getUint16(rangeOffsetAt);

    if (start > code) return 0;

    if (rangeOffset === 0) return (code + delta) % UINT16_RANGE;

    const glyphId = view.getUint16(rangeOffsetAt + rangeOffset + 2 * (code - start));

    if (glyphId === 0) return 0;

    return (glyphId + delta) % UINT16_RANGE;
  }

  return 0;
};

/** The `glyf` byte offset and length of a glyph, from the short (format 0) or long `loca`. */
const glyphSpanOf = (view: DataView, glyphId: number): [number, number] => {
  const head = tableOffsetOf(view, 'head');
  const loca = tableOffsetOf(view, 'loca');
  const glyf = tableOffsetOf(view, 'glyf');
  const isShort = view.getInt16(head + HEAD_LOCA_FORMAT) === 0;
  const readShort = (index: number): number => view.getUint16(loca + index * 2) * 2;
  const readLong = (index: number): number => view.getUint32(loca + index * 4);
  const readOffset = isShort ? readShort : readLong;
  const start = readOffset(glyphId);
  const end = readOffset(glyphId + 1);

  return [glyf + start, end - start];
};

export const glyphLengthOf = (view: DataView, glyphId: number): number => glyphSpanOf(view, glyphId)[1];

/** The header `xMax` of a glyph: it counts control points, so it is an upper bound of the ink. */
export const glyphXMaxOf = (view: DataView, glyphId: number): number => view.getInt16(glyphSpanOf(view, glyphId)[0] + GLYPH_X_MAX);

export const glyphYMaxOf = (view: DataView, glyphId: number): number => view.getInt16(glyphSpanOf(view, glyphId)[0] + GLYPH_Y_MAX);
