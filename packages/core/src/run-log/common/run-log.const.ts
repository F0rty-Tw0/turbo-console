/** An object larger than this is counted invalid and skipped. */
export const RUN_LOG_OBJECT_MAX = 1_048_576;

/** A file whose first this many objects are all invalid is not a format this version reads. */
export const RUN_LOG_PROBE = 3;

/** The first words of a task's `cache hit, replaying logs <hash>` and `cache hit, suppressing logs <hash>` lines. */
export const CACHE_HIT_PATTERN = /^cache hit, /;
