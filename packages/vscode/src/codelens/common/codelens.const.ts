/** Spec 1c-b §4.11 / D6: a lens title names at most this many tasks. */
export const LENS_NAMES_MAX = 3;

/**
 * Past this many UTF-16 units (1 MiB) the open text is not parsed and the lens sits on line 0: the parse runs on every
 * refresh, and a 15 MB manifest took about 1 s on the extension host.
 */
export const LENS_TEXT_MAX = 1024 * 1024;

export const LENS_COMMAND = 'turboConsole.runPackageTask';
