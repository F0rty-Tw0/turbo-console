/** The command that opens a root's Package Graph panel, or reveals the one that is open. */
export const GRAPH_COMMAND = 'turboConsole.openPackageGraph';

/** The workspace package the model adds for the repo root; the fixture manifest does not list it. */
export const ROOT_PACKAGE_NAME = '//';

/** A graph hash as the host makes it: eight lower-case hex digits. */
export const HASH_PATTERN = /^[0-9a-f]{8}$/;
