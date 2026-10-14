import { plainLine, plainLines } from '@turbo-console/core';

const ELLIPSIS = '…';

/** Input past `max` times this many UTF-16 units is never read: cleaning costs O(max), however long the repo text. */
const WINDOW_FACTOR = 4;

/** Any space, tab or line break (VT, FF and NEL among them): each becomes a plain space, so `a\nb` does not read as `ab`. */
const WHITESPACE = /\p{White_Space}/gu;

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

const oneLine = (text: string): string => {
  const spaced = text.replace(WHITESPACE, ' ');
  const visible = plainLine(spaced);

  return visible.replace(SPACE_RUN, ' ');
};

/**
 * Text from a repo, a model or a summary is untrusted: one line with ANSI escapes, controls, invisible and bidi
 * characters and lone surrogates dropped by core's rule (`plainLine`), each whitespace run turned into one space, cut to
 * `max` UTF-16 units with a trailing ellipsis, never leaving half of a surrogate pair.
 */
export const cleanText = (text: string, max: number): string => cleanedWith(text, max, oneLine);

/** As `cleanText`, but newline and tab are kept (`plainLines`): a multi-line message keeps its lines. */
export const cleanLines = (text: string, max: number): string => cleanedWith(text, max, plainLines);
