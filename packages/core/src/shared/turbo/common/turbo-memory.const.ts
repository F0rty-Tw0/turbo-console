/**
 * Resident memory bound for one turbo process, 4 GiB: the largest measured peak, 389 MiB, times 10, rounded up. Past
 * it turbo is killed as a runaway.
 */
export const MAX_RSS_BYTES = 4 * 2 ** 30;

/** How often turbo's resident memory is read, per platform (ms): procfs is a file read, `ps` and `tasklist` are spawns. */
export const RSS_POLL_MS: Readonly<Partial<Record<NodeJS.Platform, number>>> = Object.freeze({
  linux: 100,
  darwin: 250,
  win32: 500
});

/** For a platform `RSS_POLL_MS` has no entry for. */
export const DEFAULT_RSS_POLL_MS = 500;
