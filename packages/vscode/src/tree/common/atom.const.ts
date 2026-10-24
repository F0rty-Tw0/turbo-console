import type { AtomView } from './atom-view.type.ts';

/** The view of a package without Atomizer groups, or one whose model is not loaded. */
export const NO_ATOMS: AtomView = { groups: [], dryRun: null, results: null };

export const LIVE_NOTE = "Live spec: uncached unless the Atomizer's commitEnv is set";
