import { constants } from 'node:fs';

/**
 * Read-only and non-blocking: a FIFO opens at once instead of waiting for a writer, and then fails the caller's
 * regular-file check. Windows defines no `O_NONBLOCK` (and has no FIFOs): `| undefined` is `| 0` there.
 */
export const READ_NON_BLOCKING = constants.O_RDONLY | constants.O_NONBLOCK;

/**
 * `READ_NON_BLOCKING` that also refuses a symlink as the last path part (ELOOP), so a file swapped for a symlink after
 * it was listed is not followed. Windows defines no `O_NOFOLLOW` (the types still say `number`): `| undefined` is `| 0`
 * there, so the flag is dropped.
 */
export const READ_NO_FOLLOW = READ_NON_BLOCKING | constants.O_NOFOLLOW;
