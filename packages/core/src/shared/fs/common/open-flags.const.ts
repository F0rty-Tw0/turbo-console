import { constants } from 'node:fs';

/**
 * Read-only and non-blocking: a FIFO opens at once instead of waiting for a writer, and then fails the caller's
 * regular-file check. Windows defines no `O_NONBLOCK` (and has no FIFOs): `| undefined` is `| 0` there.
 */
export const READ_NON_BLOCKING = constants.O_RDONLY | constants.O_NONBLOCK;
