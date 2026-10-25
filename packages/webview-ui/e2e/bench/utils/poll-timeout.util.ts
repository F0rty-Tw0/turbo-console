/** The text Playwright puts in the error of an `expect.poll` that ran out of time. */
const POLL_TIMEOUT_TEXT = 'exceeded while waiting on the predicate';

/** The error is the timeout of an `expect.poll`; a failing predicate, a closed page or the test's own timeout are not. */
export const isPollTimeout = (error: unknown): boolean => error instanceof Error && error.message.includes(POLL_TIMEOUT_TEXT);
