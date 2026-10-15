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

const OSC_START = '\u001B]';

/**
 * What ends an OSC, and how many of its UTF-16 units belong to the OSC. A terminal's ends: ST (`ESC \`, or 8-bit
 * U+009C) and BEL end it; CAN and SUB abort it; another ESC or an 8-bit CSI (U+009B) aborts it and starts its own
 * sequence, so it is kept. Plus a newline, which a terminal ignores there: kept, so a stray `ESC ]` hides at most the
 * rest of its line.
 */
const OSC_ENDS = [
  { end: '\u001B\\', length: 2 },
  { end: '\u009C', length: 1 },
  { end: '\u0007', length: 1 },
  { end: '\u0018', length: 1 },
  { end: '\u001A', length: 1 },
  { end: '\u001B', length: 0 },
  { end: '\u009B', length: 0 },
  { end: '\n', length: 0 }
];

/** The rest of `part`, which follows an OSC start, after the OSC's end; `''` when nothing ends it. */
const afterOsc = (part: string): string => {
  const ats = OSC_ENDS.map(({ end }) => part.indexOf(end));
  const found = ats.filter((at) => at >= 0);
  const firstAt = Math.min(...found);
  const endsThere = OSC_ENDS.filter((_, i) => ats[i] === firstAt);
  const lengths = endsThere.map(({ length }) => length);
  const length = Math.max(0, ...lengths);

  return part.slice(firstAt + length);
};

const LONE_ST = '\u001B\\';

/**
 * `text` with every OSC sequence (a window title, a hyperlink) cut out: `stripVTControlCharacters` leaves one whose text
 * holds a space, and its body would show once the escape characters are dropped. A lone ST left by an OSC that a
 * newline ended goes too: `stripVTControlCharacters` keeps it, and its `\` would show.
 */
const withoutOsc = (text: string): string => {
  const [head, ...oscs] = text.split(OSC_START);
  const rests = oscs.map(afterOsc);
  const parts = [head, ...rests];
  const joined = parts.join('');

  return joined.replaceAll(LONE_ST, '');
};

const keptChars = (text: string, isKept: (char: string) => boolean): string => {
  const unescaped = stripVTControlCharacters(withoutOsc(text));
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
