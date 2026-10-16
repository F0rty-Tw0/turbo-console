import type { LiveIds } from '../../../run/common/run.type.ts';

const NOTHING_LIVE: LiveIds = () => new Set();

/** The scripts half of `TreePorts` for a tree with the toggle off and no live script run. */
export const SCRIPTS_HIDDEN_PORTS = { scriptsShown: (): boolean => false, runningIds: NOTHING_LIVE };
