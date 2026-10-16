export const DETAILS_VIEW_TYPE = 'turboConsole.packageDetails';

/** The folder of the built page under the extension, the only `localResourceRoots` entry of a panel. */
export const DETAILS_ASSET_DIR: string[] = ['dist', 'webview', 'details'];

/** Joins a panel key's root and package name; a root path cannot hold `\0`, so the first one ends the root and two keys never collide. */
export const PANEL_ID_SEPARATOR = '\0';

/** The registry keeps this many of the last messages posted to a panel, for the integration tests. */
export const POSTED_MAX = 100;

export const OPEN_FAILED_TEXT = 'Could not open Package Details. See Output.';

export const NO_BINARY_TEXT = 'No turbo binary for this workspace folder.';

/** A dropped webview message is logged as at most this many units of its JSON text. */
export const DROPPED_MESSAGE_MAX = 200;

/** Logged in place of a message `JSON.stringify` cannot turn into text (BigInt, a cycle, a throwing `toJSON`, `undefined`). */
export const UNPRINTABLE_MESSAGE = 'unprintable message';
