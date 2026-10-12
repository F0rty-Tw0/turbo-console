import { stripVTControlCharacters } from 'node:util';

/**
 * Code point ranges that never reach a message, inclusive: C0 controls; DEL and the C1 controls (U+0085 NEL among
 * them); the soft hyphen; the Arabic letter mark; the Mongolian vowel separator; zero-width space, joiners and
 * direction marks; line and paragraph separators, bidi embeddings and overrides; word joiner, invisible operators,
 * bidi isolates and deprecated format characters; the byte order mark; interlinear annotation characters; tag
 * characters (astral, so the text is walked by code point).
 */
const DROPPED_RANGES: (readonly [number, number])[] = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0xad, 0xad],
  [0x61c, 0x61c],
  [0x180e, 0x180e],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
  [0xe0000, 0xe007f]
];

const isDropped = (code: number): boolean => {
  for (const [from, to] of DROPPED_RANGES) {
    if (code >= from && code <= to) return true;
  }

  return false;
};

const isPrintable = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;

  return !isDropped(code);
};

const isLineText = (char: string): boolean => isPrintable(char) || char === '\n' || char === '\t';

const keptChars = (text: string, isKept: (char: string) => boolean): string => {
  const unescaped = stripVTControlCharacters(text);
  const chars = [...unescaped];

  return chars.filter(isKept).join('');
};

/**
 * Text from turbo or the repo (an inherited FORCE_COLOR, echoed repo text) made safe for a message: no ANSI escapes,
 * no control, invisible or bidi characters (`DROPPED_RANGES`), except newline and tab.
 */
export const plainLines = (text: string): string => keptChars(text, isLineText);

/** As `plainLines`, with newline and tab dropped too: one line that cannot fake another. */
export const plainLine = (text: string): string => keptChars(text, isPrintable);
