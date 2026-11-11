import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { BARE, BARE_FIRST_BLOCKED, CONCURRENCY_VALUE } from '../../shared/turbo/common/turbo-args.const.ts';
import type { RunExtras } from '../common/run-args.type.ts';

const ECHO_LIMIT = 200;

const quoted = (value: string): string => JSON.stringify(value.slice(0, ECHO_LIMIT));

const isBadArg = (arg: string): boolean => {
  const isBare = BARE.test(arg);
  const startsBlocked = BARE_FIRST_BLOCKED.test(arg);

  return !isBare || startsBlocked;
};

const assertConcurrency = (concurrency: string): void => {
  const isValid = CONCURRENCY_VALUE.test(concurrency);

  if (isValid) return;

  throw new TurboException(
    'invalid-argument',
    `invalid concurrency ${quoted(concurrency)}: must be a whole number of at least 1, or a percentage such as 50%`
  );
};

/** Throws `invalid-argument` when the concurrency or a pass-through arg could reach the shell or turbo unsafely. */
export const assertRunExtras = (extras: RunExtras): void => {
  const { concurrency } = extras;

  if (concurrency !== undefined) assertConcurrency(concurrency);

  const passThrough = extras.passThrough ?? [];
  const badIndex = passThrough.findIndex(isBadArg);

  if (badIndex === -1) return;

  throw new TurboException(
    'invalid-argument',
    `invalid pass-through argument ${badIndex + 1} ${quoted(passThrough[badIndex] ?? '')}: may only use letters, digits and @ / . _ : = + -, and cannot start with = or @`
  );
};
