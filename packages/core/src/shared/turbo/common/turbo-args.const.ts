/** Verify-first V2: pins this binary instead of a repo-local turbo, and drops the "no local turbo" warning. */
export const SKIP_INFER = '--skip-infer';

/** Tells turbo the root is a single package. Under `--skip-infer` turbo never infers it, so it stays in monorepo mode without this. */
export const SINGLE_PACKAGE = '--single-package';
