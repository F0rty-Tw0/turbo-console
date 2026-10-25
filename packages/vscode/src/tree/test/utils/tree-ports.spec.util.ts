import type { LiveIds } from '../../../run/common/run.type.ts';
import type { AtomHostPorts } from '../../common/atom-load.type.ts';

const NOTHING_LIVE: LiveIds = () => new Set();

/** Atomizer ports of a root whose turbo is not resolved: no binary, so no tree built over them ever starts a load. */
export const ATOM_IDLE_PORTS: AtomHostPorts = {
  binaryOf: () => null,
  dryRun: async () => Promise.resolve([]),
  results: async () => Promise.resolve(new Map()),
  log: () => undefined
};

/** The scripts half of `TreePorts` for a tree with the toggle off and no live script run, plus idle Atomizer ports. */
export const SCRIPTS_HIDDEN_PORTS = { scriptsShown: (): boolean => false, runningIds: NOTHING_LIVE, atom: ATOM_IDLE_PORTS };
