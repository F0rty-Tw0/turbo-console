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

const invalidName = (name: string, reason: string): TurboException => {
  const quoted = JSON.stringify(name.slice(0, MAX_ECHOED_LENGTH));
  const echoed = plainLine(quoted);

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
