/** A word every shell passes through unquoted; the allowlist of a script name and the bare words of Copy Command. */
export const BARE = /^[A-Za-z0-9@/._:=+-]+$/u;

export const BARE_FIRST_BLOCKED = /^[=@]/u;

/**
 * A script name's blocked first characters: pnpm reads `/…/` as a regex selector when no script of that exact name has a
 * body, and refuses a `.` name as hidden (`ERR_PNPM_HIDDEN_SCRIPT`). This also refuses `//`, package.json's comment key.
 */
export const SCRIPT_NAME_FIRST_BLOCKED = /^[/.]/u;

/** The turbo flag Copy Command ends with for a single-package root; core's `SINGLE_PACKAGE` is not in its public API. */
export const SINGLE_PACKAGE_FLAG = '--single-package';
