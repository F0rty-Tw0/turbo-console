/** What went wrong, for callers that branch on it; the message carries the detail. */
export type TurboErrorKind = 'not-found' | 'version-unsupported' | 'failed' | 'invalid-output' | 'invalid-argument' | 'io';

/** How a turbo spawn ended without an exit code: its time budget ran out, or the caller aborted it. */
export type AbortOutcome = 'timeout' | 'aborted';
