import {
  BACKTICK_CODE,
  BOM_CODE,
  CARRIAGE_RETURN_CODE,
  EN_QUAD_CODE,
  HAIR_SPACE_CODE,
  IDEOGRAPHIC_SPACE_CODE,
  LINE_FEED_CODE,
  LINE_SEPARATOR_CODE,
  MEDIUM_MATHEMATICAL_SPACE_CODE,
  NARROW_NO_BREAK_SPACE_CODE,
  NO_BREAK_SPACE_CODE,
  OGHAM_SPACE_MARK_CODE,
  OPEN_BRACE_CODE,
  PARAGRAPH_SEPARATOR_CODE,
  SLASH_CODE
} from '../common/source-text.const.ts';
import type { QuotedEnd, TemplateChunk } from '../common/source-token.type.ts';

const BACKSLASH = 0x5c;
const OPEN_BRACKET = 0x5b;
const CLOSE_BRACKET = 0x5d;
const DOLLAR = 0x24;
const SPACE = 0x20;
const NON_ASCII_MIN = 0x80;

const isBreak = (code: number): boolean => code === LINE_FEED_CODE || code === CARRIAGE_RETURN_CODE;

const isUnicodeSpaceCode = (code: number): boolean => {
  const isNoBreak = code === NO_BREAK_SPACE_CODE || code === BOM_CODE;
  const isSeparator = code === LINE_SEPARATOR_CODE || code === PARAGRAPH_SEPARATOR_CODE;
  const isEnSpace = code >= EN_QUAD_CODE && code <= HAIR_SPACE_CODE;

  return isNoBreak || isSeparator || isEnSpace;
};

const isWideSpaceCode = (code: number): boolean => {
  const isEdge = code === OGHAM_SPACE_MARK_CODE || code === IDEOGRAPHIC_SPACE_CODE;
  const isNarrow = code === NARROW_NO_BREAK_SPACE_CODE || code === MEDIUM_MATHEMATICAL_SPACE_CODE;

  return isEdge || isNarrow;
};

const isSpaceCode = (code: number): boolean => {
  const isAsciiSpace = code <= SPACE;
  const isUnicodeSpace = isUnicodeSpaceCode(code);
  const isWideSpace = isWideSpaceCode(code);

  return isAsciiSpace || isUnicodeSpace || isWideSpace;
};

const isWordCode = (code: number): boolean => {
  const isDigit = code >= 0x30 && code <= 0x39;
  const isUpper = code >= 0x41 && code <= 0x5a;
  const isLower = code >= 0x61 && code <= 0x7a;
  const isSymbol = code === 0x5f || code === DOLLAR;

  const isNonAscii = code >= NON_ASCII_MIN && !isSpaceCode(code);

  return isDigit || isUpper || isLower || isSymbol || isNonAscii;
};

export const quotedEndOf = (text: string, start: number): QuotedEnd => {
  const quote = text.charCodeAt(start);
  let index = start + 1;

  while (index < text.length) {
    const code = text.charCodeAt(index);
    const isLineBreak = isBreak(code);
    const isNextBreak = isBreak(text.charCodeAt(index + 1));
    const isEscape = code === BACKSLASH && !isNextBreak;
    const step = isEscape ? 2 : 1;

    if (isLineBreak) {
      const broken: QuotedEnd = { end: index, isClosed: false };

      return broken;
    }

    if (code === quote) {
      const closed: QuotedEnd = { end: index + 1, isClosed: true };

      return closed;
    }

    index += step;
  }

  const unclosed: QuotedEnd = { end: text.length, isClosed: false };

  return unclosed;
};

export const wordEndOf = (text: string, start: number): number => {
  let index = start;

  while (index < text.length && isWordCode(text.charCodeAt(index))) index += 1;

  return index;
};

export const regexEndOf = (text: string, start: number): number => {
  let index = start + 1;
  let inClass = false;

  while (index < text.length) {
    const code = text.charCodeAt(index);

    const isLineBreak = isBreak(code);
    const isNextBreak = isBreak(text.charCodeAt(index + 1));

    if (isLineBreak) return index;

    if (code === BACKSLASH && !isNextBreak) {
      index += 2;
      continue;
    }

    const isRegexClose = code === SLASH_CODE && !inClass;

    if (isRegexClose) return wordEndOf(text, index + 1);

    if (code === OPEN_BRACKET) inClass = true;

    if (code === CLOSE_BRACKET) inClass = false;

    index += 1;
  }

  return text.length;
};

export const blockCommentEndOf = (text: string, start: number): number => {
  const close = text.indexOf('*/', start + 2);

  const afterClose = close + 2;

  return close === -1 ? text.length : afterClose;
};

export const lineEndOf = (text: string, start: number): number => {
  let index = start;

  while (index < text.length && !isBreak(text.charCodeAt(index))) index += 1;

  return index;
};

export const templateChunkOf = (text: string, start: number): TemplateChunk => {
  let index = start;

  while (index < text.length) {
    const code = text.charCodeAt(index);

    if (code === BACKSLASH) {
      index += 2;
      continue;
    }

    const nextCode = text.charCodeAt(index + 1);
    const opensSubstitution = code === DOLLAR && nextCode === OPEN_BRACE_CODE;

    if (code === BACKTICK_CODE) {
      const backtick: TemplateChunk = { end: index + 1, opensSubstitution: false, isClosed: true };

      return backtick;
    }

    if (opensSubstitution) {
      const substitution: TemplateChunk = { end: index + 2, opensSubstitution: true, isClosed: true };

      return substitution;
    }

    index += 1;
  }

  const unclosed: TemplateChunk = { end: text.length, opensSubstitution: false, isClosed: false };

  return unclosed;
};
