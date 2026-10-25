import type { AtomView } from './atom-view.type.ts';

/** The view of a package without Atomizer groups, or one whose model is not loaded. */
export const NO_ATOMS: AtomView = { groups: [], dryRun: null, results: null };

export const LIVE_NOTE = "Live spec: uncached unless the Atomizer's commitEnv is set";

/** The command a file row of an Atomizer group runs when clicked: opens the spec file. */
export const OPEN_SPEC_COMMAND = 'turboConsole.openSpec';
