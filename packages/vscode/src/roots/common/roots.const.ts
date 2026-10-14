export const ROOT_MARKERS = ['turbo.json', 'turbo.jsonc'];

export const LOAD_DEADLINE_MS = 60_000;

/**
 * Extra time past the deadline before a load that ignores its deadline is abandoned (core does not bound every step).
 * Must stay well above core's turbo kill grace (5 s in `run-turbo.ts`), so core's own `timed out` error wins a normal expiry.
 */
export const LOAD_GRACE_MS = 15_000;

/** Loads that may run at once across every root of the window; the rest wait for a slot. */
export const MAX_CONCURRENT_LOADS = 2;
