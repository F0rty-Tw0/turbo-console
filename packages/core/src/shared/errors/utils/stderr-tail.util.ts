import { stripVTControlCharacters } from 'node:util';

/** Caps the scan and the message: a single huge line, or a 256 MB stderr on the exit path, never lands whole. */
const MAX_TAIL_LENGTH = 8192;

const FIRST_PRINTABLE = 0x20;

const DELETE = 0x7f;

/** Drops C0 controls and DEL, except newline and tab. */
const isKeptChar = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  const isControl = code < FIRST_PRINTABLE || code === DELETE;

  return !isControl || char === '\n' || char === '\t';
};

/** turbo's stderr (an inherited FORCE_COLOR, echoed repo text) as plain text: no ANSI escapes, no controls but newline and tab. */
const plainText = (text: string): string => {
  const unescaped = stripVTControlCharacters(text);
  const chars = [...unescaped];

  return chars.filter(isKeptChar).join('');
};

/**
 * The last `lines` lines of the last 8 Ki characters of `stderr`, CRLF normalised, ANSI escapes and other control
 * characters removed, trailing whitespace dropped (`''` for empty stderr). When the cut lands mid-line, that partial
 * line is dropped, unless it is the only one.
 */
export const stderrTail = (stderr: string, lines: number): string => {
  const recent = stderr.slice(-MAX_TAIL_LENGTH);
  const unixLines = recent.replaceAll('\r\n', '\n');
  const normalised = plainText(unixLines).trimEnd();

  if (normalised === '') return '';

  const all = normalised.split('\n');
  const afterCut = all.slice(1);
  const isPartial = recent.length < stderr.length && afterCut.length > 0;
  const whole = isPartial ? afterCut : all;

  return whole.slice(-lines).join('\n');
};
