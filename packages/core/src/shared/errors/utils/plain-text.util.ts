import { stripVTControlCharacters } from 'node:util';

const FIRST_PRINTABLE = 0x20;

const DELETE = 0x7f;

const isPrintable = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;

  return code >= FIRST_PRINTABLE && code !== DELETE;
};

const isLineText = (char: string): boolean => isPrintable(char) || char === '\n' || char === '\t';

const keptChars = (text: string, isKept: (char: string) => boolean): string => {
  const unescaped = stripVTControlCharacters(text);
  const chars = [...unescaped];

  return chars.filter(isKept).join('');
};

/**
 * Text from turbo or the repo (an inherited FORCE_COLOR, echoed repo text) made safe for a message: no ANSI escapes,
 * no C0 control characters or DEL, except newline and tab.
 */
export const plainLines = (text: string): string => keptChars(text, isLineText);

/** As `plainLines`, with newline and tab dropped too: one line that cannot fake another. */
export const plainLine = (text: string): string => keptChars(text, isPrintable);
