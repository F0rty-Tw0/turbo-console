import { POSTED_MAX } from '../common/details.const.ts';

/** Appends `message` and drops the oldest ones past `POSTED_MAX`. */
export const recordPosted = <TMessage>(posted: TMessage[], message: TMessage): void => {
  posted.push(message);

  const excess = posted.length - POSTED_MAX;

  if (excess > 0) posted.splice(0, excess);
};
