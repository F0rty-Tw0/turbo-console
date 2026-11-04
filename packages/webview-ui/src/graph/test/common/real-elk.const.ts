/** Cold `elk.bundled.js` init on macOS CI passed the 5000 ms default (run 41724715676). */
export const REAL_ELK_TIMEOUT_MS = 30_000;

/** `describe` timeouts skip hooks (hookTimeout stays 10 s); ubuntu CI hit it laying out the 8 U0 views in one `beforeAll` (run 41755230370). */
export const REAL_ELK_HOOK_TIMEOUT_MS = 60_000;
