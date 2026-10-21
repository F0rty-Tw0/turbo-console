/** A registry keeps this many of the last messages posted to a panel, for the integration tests. */
export const POSTED_MAX = 100;

/** A dropped webview message is logged as at most this many units of its JSON text. */
export const DROPPED_MESSAGE_MAX = 200;

/** Logged in place of a message `JSON.stringify` cannot turn into text (BigInt, a cycle, a throwing `toJSON`, `undefined`). */
export const UNPRINTABLE_MESSAGE = 'unprintable message';
