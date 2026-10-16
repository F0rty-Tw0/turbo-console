/** A word every shell passes through unquoted; the allowlist of a script name and the bare words of Copy Command. */
export const BARE = /^[A-Za-z0-9@/._:=+-]+$/u;

export const BARE_FIRST_BLOCKED = /^[=@]/u;

/** pnpm reads a script name that starts with `/` as a regex selector and `.` is a path or hidden key; `//` is package.json's comment key. */
export const SCRIPT_NAME_FIRST_BLOCKED = /^[/.]/u;
