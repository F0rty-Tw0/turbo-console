import { ENTRY_TEXT_MAX } from '@turbo-console/webview-ui';

const HIGH_SURROGATE_FIRST = 0xd800;
const HIGH_SURROGATE_LAST = 0xdbff;

const PAIR_SAFE_MAX = ENTRY_TEXT_MAX - 1;

/** ALM, LRM and RLM, the embeddings and overrides, and the isolates. */
const BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;

const SHOWN_CONTROL = '\uFFFD';

const isHighSurrogate = (unit: number): boolean => unit >= HIGH_SURROGATE_FIRST && unit <= HIGH_SURROGATE_LAST;

/** Shows bidi and invisible control characters as U+FFFD before the length cut, so file text cannot reorder the excerpt. Shared by manifest entries and import sites (spec D13). */
export const cutEntryText = (raw: string): string => {
  const text = raw.replace(BIDI_CONTROLS, SHOWN_CONTROL);

  if (text.length <= ENTRY_TEXT_MAX) return text;

  const splitsPair = isHighSurrogate(text.charCodeAt(PAIR_SAFE_MAX));
  const keptUnits = splitsPair ? PAIR_SAFE_MAX : ENTRY_TEXT_MAX;

  return `${text.slice(0, keptUnits)}…`;
};
