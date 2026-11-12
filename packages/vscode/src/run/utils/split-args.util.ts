import { argsErrorText } from './run-options-text.util.ts';
import type { SplitArgs, SplitArgsError } from '../common/run-options.type.ts';
import { BARE, BARE_FIRST_BLOCKED } from '../common/shell.const.ts';

const isAllowedArg = (word: string): boolean => {
  const isBare = BARE.test(word);
  const isBlockedFirst = BARE_FIRST_BLOCKED.test(word);

  return isBare && !isBlockedFirst;
};

/** Splits the Extra arguments box on whitespace; names the first word that is not a plain argument. */
export const splitArgs = (text: string): SplitArgs => {
  const args = text.split(/\s+/u).filter((word) => word !== '');
  const badIndex = args.findIndex((word) => !isAllowedArg(word));

  if (badIndex !== -1) {
    const failure: SplitArgsError = { error: argsErrorText(badIndex + 1, args[badIndex] ?? '') };

    return failure;
  }

  const ok: SplitArgs = { args };

  return ok;
};
