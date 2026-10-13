import { TurboException } from '../../errors/common/turbo.exception.ts';
import { plainLine } from '../../errors/utils/plain-text.util.ts';

const FIRST_PRINTABLE = 0x20;

const DELETE = 0x7f;

const isControl = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;

  return code < FIRST_PRINTABLE || code === DELETE;
};

/** A workspace-derived name can be any length: the message echoes only its start. */
const MAX_ECHOED_LENGTH = 200;

/** A character a plain line would drop is written as `\u{hex}` instead, so the echo shows where it was. */
const escapedIfDropped = (char: string): string => {
  const plain = plainLine(char);

  if (plain !== '') return char;

  const code = char.codePointAt(0) ?? 0;
  const hex = code.toString(16);

  return `\\u{${hex}}`;
};

/** The name's first 200 characters, JSON-quoted, then on one plain line with every dropped character escaped. */
const invalidName = (name: string, reason: string): TurboException => {
  const quoted = JSON.stringify(name.slice(0, MAX_ECHOED_LENGTH));
  const chars = [...quoted];
  const echoed = chars.map(escapedIfDropped).join('');

  return new TurboException('invalid-argument', `invalid turbo name ${echoed}: ${reason}`);
};

/** Rejects a workspace-derived name that turbo could read as a flag, or that carries a control character (U+0000–U+001F, U+007F). */
export const assertTurboName = (name: string): void => {
  if (name === '') throw invalidName(name, 'empty');

  const isFlagLike = name.startsWith('-');

  if (isFlagLike) throw invalidName(name, 'starts with -');

  const chars = [...name];
  const hasControl = chars.some(isControl);

  if (hasControl) throw invalidName(name, 'contains a control character');
};

const FILTER_LEADING_CHARS = ['!', '^', '.'];

const FILTER_SYNTAX_CHARS = ['{', '}', '[', ']', '*'];

/** Also rejects a package name turbo's `--filter` would read as syntax (negation, path, `...`, `^` beside `...`, glob, braces). */
export const assertFilterName = (name: string): void => {
  assertTurboName(name);

  const first = name.charAt(0);
  const leading = FILTER_LEADING_CHARS.find((char) => char === first);

  if (leading !== undefined) throw invalidName(name, `starts with ${leading}`);

  const hasEllipsis = name.includes('...');

  if (hasEllipsis) throw invalidName(name, 'contains ...');

  const syntax = FILTER_SYNTAX_CHARS.find((char) => name.includes(char));

  if (syntax !== undefined) throw invalidName(name, `contains ${syntax}`);
};

/** Rejects a task name that holds `#`: turbo reads `pkg#task` as a package and a task, so a `#` in the name changes which task runs. */
export const assertTaskName = (name: string): void => {
  assertTurboName(name);

  const hasHash = name.includes('#');

  if (hasHash) throw invalidName(name, 'contains #');
};
