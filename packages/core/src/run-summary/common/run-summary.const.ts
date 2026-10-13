/** A summary lists every task of a run, so it can be large; a bigger file is skipped, never read whole. */
export const MAX_SUMMARY_BYTES = 64 * 1024 * 1024;

/** turbo never prunes `.turbo/runs`: only the newest files are tried, so a pile of broken ones costs a bounded read. */
export const MAX_SUMMARY_TRIES = 20;

/**
 * A summary is written during its run, so its mtime lies near the run window; one far off (a future-dated file among
 * them) belongs to another run and is never tried, so it cannot hold a place among the newest `MAX_SUMMARY_TRIES`.
 * Wide on purpose: the filesystem clock can differ from the host clock (WSL2 drvfs, NFS, container bind mounts); the
 * window only needs to keep far-future and old files out.
 */
export const SUMMARY_MTIME_SLACK_MS = 10 * 60 * 1000;
