import { bodyStartOf } from './source-lines.util.ts';
import { blockCommentEndOf, isSpaceCode, lineEndOf, quotedEndOf, regexEndOf, templateChunkOf, wordEndOf } from './source-scan.util.ts';
import { BACKTICK_CODE, OPEN_BRACE_CODE, REGEX_AFTER_WORDS, SLASH_CODE } from '../common/source-text.const.ts';
import type { SourceToken, TemplateChunk } from '../common/source-token.type.ts';

/* eslint-disable local/readonly-type-properties -- every step advances one shared cursor and previous-token slot in place */
type LexState = {
  index: number;
  previous: SourceToken | null;
  readonly depths: number[];
  readonly tokens: SourceToken[];
};
/* eslint-enable local/readonly-type-properties */

const DOUBLE_QUOTE = 0x22;
const SINGLE_QUOTE = 0x27;
const STAR = 0x2a;
const CLOSE_BRACE = 0x7d;
const NO_COMMENT = -1;

const isRegexStart = (previous: SourceToken | null): boolean => {
  if (previous === null) return true;

  if (previous.kind === 'word') return REGEX_AFTER_WORDS.has(previous.value);

  const isClosing = previous.value === ')' || previous.value === ']';

  return previous.kind === 'punct' && !isClosing;
};

const commentEndOf = (text: string, index: number): number => {
  const nextCode = text.charCodeAt(index + 1);

  if (nextCode === SLASH_CODE) return lineEndOf(text, index);

  if (nextCode === STAR) return blockCommentEndOf(text, index);

  return NO_COMMENT;
};

const emit = (state: LexState, token: SourceToken, end: number): void => {
  state.tokens.push(token);
  state.previous = token;
  state.index = end;
};

const templateTokenOf = (text: string, start: number, chunk: TemplateChunk): SourceToken => {
  const raw = text.slice(start + 1, chunk.end - 1);
  const broken: SourceToken = { kind: 'broken', value: '', start };
  const complex: SourceToken = { kind: 'complex', value: '', start };
  const template: SourceToken = { kind: 'template', value: raw, start };

  if (!chunk.isClosed) return broken;

  return chunk.opensSubstitution ? complex : template;
};

const templateEdgeOf = (state: LexState, chunk: TemplateChunk, token: SourceToken): void => {
  const brace: SourceToken = { kind: 'punct', value: '{', start: chunk.end - 1 };
  const previous = chunk.opensSubstitution ? brace : token;

  if (chunk.opensSubstitution) state.depths.push(0);

  state.previous = previous;
  state.index = chunk.end;
};

const templateOpenAt = (text: string, state: LexState): void => {
  const start = state.index;
  const chunk = templateChunkOf(text, start + 1);
  const token = templateTokenOf(text, start, chunk);

  state.tokens.push(token);
  templateEdgeOf(state, chunk, token);
};

const templateResumeAt = (text: string, state: LexState): void => {
  const start = state.index;
  const chunk = templateChunkOf(text, start + 1);
  const token = templateTokenOf(text, start, chunk);

  templateEdgeOf(state, chunk, token);
};

const quoteAt = (text: string, state: LexState): void => {
  const start = state.index;
  const quoted = quotedEndOf(text, start);
  const closed: SourceToken = { kind: 'string', value: text.slice(start + 1, quoted.end - 1), start };
  const broken: SourceToken = { kind: 'broken', value: '', start };

  emit(state, quoted.isClosed ? closed : broken, quoted.end);
};

const slashAt = (text: string, state: LexState): void => {
  const start = state.index;
  const commentEnd = commentEndOf(text, start);
  const division: SourceToken = { kind: 'punct', value: '/', start };
  const placeholder: SourceToken = { kind: 'broken', value: '', start };
  const isRegex = isRegexStart(state.previous);

  if (commentEnd !== NO_COMMENT) {
    state.index = commentEnd;

    return;
  }

  if (isRegex) {
    state.index = regexEndOf(text, start);
    state.previous = placeholder;

    return;
  }

  emit(state, division, start + 1);
};

const braceDeltaOf = (code: number): number => {
  if (code === OPEN_BRACE_CODE) return 1;

  return code === CLOSE_BRACE ? -1 : 0;
};

const punctAt = (text: string, state: LexState): void => {
  const start = state.index;
  const code = text.charCodeAt(start);
  const top = state.depths.at(-1);
  const isContinuation = code === CLOSE_BRACE && top === 0;
  const isSpread = text.startsWith('...', start);
  const char = text.charAt(start);
  const value = isSpread ? '...' : char;
  const punct: SourceToken = { kind: 'punct', value, start };

  if (isContinuation) {
    state.depths.pop();
    templateResumeAt(text, state);

    return;
  }

  const delta = braceDeltaOf(code);

  if (top !== undefined) state.depths[state.depths.length - 1] = top + delta;

  emit(state, punct, start + value.length);
};

const wordAt = (text: string, state: LexState, end: number): void => {
  const start = state.index;
  const word: SourceToken = { kind: 'word', value: text.slice(start, end), start };

  emit(state, word, end);
};

const stepAt = (text: string, state: LexState): void => {
  const code = text.charCodeAt(state.index);
  const wordEnd = wordEndOf(text, state.index);
  const isQuote = code === SINGLE_QUOTE || code === DOUBLE_QUOTE;
  const isSpace = isSpaceCode(code);

  if (isSpace) {
    state.index += 1;
  } else if (wordEnd > state.index) {
    wordAt(text, state, wordEnd);
  } else if (code === SLASH_CODE) {
    slashAt(text, state);
  } else if (isQuote) {
    quoteAt(text, state);
  } else if (code === BACKTICK_CODE) {
    templateOpenAt(text, state);
  } else {
    punctAt(text, state);
  }
};

export const sourceTokensOf = (text: string): SourceToken[] => {
  const index = bodyStartOf(text);
  const state: LexState = { index, previous: null, depths: [], tokens: [] };

  while (state.index < text.length) stepAt(text, state);

  return state.tokens;
};
