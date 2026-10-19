export const ROOT_MARKERS = ['turbo.json', 'turbo.jsonc'];

export const LOAD_DEADLINE_MS = 60_000;

/**
 * Extra time past the deadline before a load that ignores its deadline is abandoned (core does not bound every step).
 * Must stay well above core's turbo kill grace (5 s in `run-turbo.ts`), so core's own `timed out` error wins a normal expiry.
 */
export const LOAD_GRACE_MS = 15_000;

/**
 * A cache read or freshness check still running after this is given up on, and the load goes on without the cache: a
 * read on a hung mount must not hold the load (and `whenIdle`) forever. The bound is for a hang, not slow I/O: a check
 * hashes every package.json and the lockfile, which on WSL `/mnt/c` or a network home can take seconds, and the cached
 * rows stay shown while it runs.
 */
export const CACHE_DEADLINE_MS = 10_000;

/** Loads that may run at once across every root of the window; the rest wait for a slot. */
export const MAX_CONCURRENT_LOADS = 2;
