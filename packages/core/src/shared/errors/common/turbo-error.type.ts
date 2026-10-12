/** What went wrong, for callers that branch on it; the message carries the detail. */
export type TurboErrorKind = 'not-found' | 'version-unsupported' | 'failed' | 'invalid-output' | 'invalid-argument' | 'io';
