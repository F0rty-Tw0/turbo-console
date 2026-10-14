import { stripVTControlCharacters } from 'node:util';

/**
 * Characters that never reach a message: controls (C0, DEL, C1 with U+0085 NEL among them); default-ignorable code
 * points (soft hyphen, zero-width characters and direction marks, bidi embeddings, overrides and isolates, word joiner,
 * invisible operators, variation selectors, Hangul fillers, the byte order mark, tag characters); line and paragraph
 * separators; every other format character (`Cf`: interlinear annotation, prepended concatenation marks, Egyptian
 * hieroglyph format controls); lone surrogates (`Cs`). Tag characters are astral, so the text is walked by code point,
 * and a lone surrogate is dropped in that same walk: dropping a character between two halves cannot join them into a
 * hidden astral character.
 */
const DROPPED = /[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}\u2028\u2029]/u;

const isPrintable = (char: string): boolean => !DROPPED.test(char);

const isLineText = (char: string): boolean => isPrintable(char) || char === '\n' || char === '\t';

const keptChars = (text: string, isKept: (char: string) => boolean): string => {
  const unescaped = stripVTControlCharacters(text);
  const chars = [...unescaped];

  return chars.filter(isKept).join('');
};

/**
 * Text from turbo or the repo (an inherited FORCE_COLOR, echoed repo text) made safe for a message: no ANSI escapes,
 * no control, invisible or bidi characters (`DROPPED`), except newline and tab.
 */
export const plainLines = (text: string): string => keptChars(text, isLineText);

/** As `plainLines`, with newline and tab dropped too: one line that cannot fake another. */
export const plainLine = (text: string): string => keptChars(text, isPrintable);
