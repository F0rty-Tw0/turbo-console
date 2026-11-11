/** Verify-first V2: pins this binary instead of a repo-local turbo, and drops the "no local turbo" warning. */
export const SKIP_INFER = '--skip-infer';

/** Tells turbo the root is a single package. Under `--skip-infer` turbo never infers it, so it stays in monorepo mode without this. */
export const SINGLE_PACKAGE = '--single-package';

/** A word every shell passes through unquoted; the allowlist of a script name and the bare words of Copy Command. */
export const BARE = /^[A-Za-z0-9@/._:=+-]+$/u;

export const BARE_FIRST_BLOCKED = /^[=@]/u;

/** A whole number of at least 1, or a percentage. */
export const CONCURRENCY_VALUE = /^[1-9][0-9]*%?$/u;
