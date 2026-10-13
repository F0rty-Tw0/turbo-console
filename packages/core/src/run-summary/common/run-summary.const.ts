/** A summary lists every task of a run, so it can be large; a bigger file is skipped, never read whole. */
export const MAX_SUMMARY_BYTES = 64 * 1024 * 1024;

/** turbo never prunes `.turbo/runs`: only the newest files are tried, so a pile of broken ones costs a bounded read. */
export const MAX_SUMMARY_TRIES = 20;
