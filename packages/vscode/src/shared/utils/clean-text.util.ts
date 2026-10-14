import { plainLines } from '@turbo-console/core';

const ELLIPSIS = '…';

/** Input past `max` times this many UTF-16 units is never read: cleaning costs O(max), however long the repo text. */
const WINDOW_FACTOR = 4;

/**
 * Any space, tab or line break (VT, FF and NEL among them), or the braille blank, which shows as a space: each becomes a
 * plain space, so `a\nb` does not read as `ab`.
 */
const WHITESPACE = /[\p{White_Space}\u2800]/gu;

/** The file, group, record and unit separators: controls that split words, so each becomes a space too. */
const SEPARATORS = ['\u001C', '\u001D', '\u001E', '\u001F'];

/** CR LF, a lone CR, VT, FF, NEL and the line and paragraph separators: each a line break in multi-line text. */
const LINE_BREAK = /\r\n?|[\v\f\u0085\u2028\u2029]/g;

/**
 * A run of spaces left once dropped characters are gone: folded into one, so padding cannot push fake text such as a run
 * state into view, even with invisible characters between the spaces.
 */
const SPACE_RUN = / {2,}/g;

const HIGH_SURROGATE_FIRST = 0xd800;
const HIGH_SURROGATE_LAST = 0xdbff;

const endsInHighSurrogate = (text: string): boolean => {
  const last = text.charCodeAt(text.length - 1);

  return last >= HIGH_SURROGATE_FIRST && last <= HIGH_SURROGATE_LAST;
};

/** `text` cut to `max` UTF-16 units with a trailing ellipsis, never leaving half of a surrogate pair; `''` below 1. */
const cutTo = (text: string, max: number): string => {
  const isUsable = max >= 1;

  if (!isUsable) return '';

  if (text.length <= max) return text;

  const cut = text.slice(0, max - 1);
  const withoutHalfPair = cut.slice(0, -1);
  const safeCut = endsInHighSurrogate(cut) ? withoutHalfPair : cut;

  return `${safeCut}${ELLIPSIS}`;
};

/**
 * The first `max * WINDOW_FACTOR` units of `text` through `plain`, then cut to `max`. A surrogate pair split by the
 * window leaves a lone half, which `plain` drops.
 */
const cleanedWith = (text: string, max: number, plain: (text: string) => string): string => {
  const window = max * WINDOW_FACTOR;
  const isWindowed = text.length > window;
  const visible = plain(text.slice(0, window));
  const marked = isWindowed ? `${visible}${ELLIPSIS}` : visible;

  return cutTo(marked, max);
};

const multiLine = (text: string): string => plainLines(text.replace(LINE_BREAK, '\n'));

/** Cleaned as lines first, so a stray OSC start hides at most the rest of its line, then made one line. */
const oneLine = (text: string): string => {
  const unseparated = SEPARATORS.reduce((acc, separator) => acc.replaceAll(separator, ' '), text);
  const visible = multiLine(unseparated);
  const spaced = visible.replace(WHITESPACE, ' ');

  return spaced.replace(SPACE_RUN, ' ');
};

/**
 * Text from a repo, a model or a summary is untrusted. Separator controls become spaces; it is cleaned as lines
 * (`cleanLines`' rule: core's `plainLines` drops ANSI escapes, controls, invisible and bidi characters and lone
 * surrogates); then every whitespace character and the braille blank become a space and space runs fold into one. Cut
 * to `max` UTF-16 units with a trailing ellipsis, never leaving half of a surrogate pair.
 */
export const cleanText = (text: string, max: number): string => cleanedWith(text, max, oneLine);

/**
 * Multi-line text: every line break (CR LF, CR, VT, FF, NEL, U+2028, U+2029) becomes a newline, then core's
 * `plainLines` keeps newline and tab and drops what `plainLine` drops. No space folding; same window and cut.
 */
export const cleanLines = (text: string, max: number): string => cleanedWith(text, max, multiLine);
