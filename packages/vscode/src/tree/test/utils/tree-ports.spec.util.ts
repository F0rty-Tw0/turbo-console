import type { LiveIds } from '../../../run/common/run.type.ts';
import type { AtomHostPorts } from '../../common/atom-load.type.ts';
import { SHARED_ATOMS_STUB } from '../stubs/shared-atoms.stub.ts';

const NOTHING_LIVE: LiveIds = () => new Set();

/** Atomizer ports of a root whose turbo is not resolved: no binary, so no shared loads built over them ever start a load. */
export const ATOM_IDLE_PORTS: AtomHostPorts = {
  binaryOf: () => null,
  dryRun: async () => Promise.resolve([]),
  results: async () => Promise.resolve(new Map()),
  log: () => undefined
};

/** The scripts half of `TreePorts` for a tree with the toggle off and no live script run, plus idle shared Atomizer loads. */
export const SCRIPTS_HIDDEN_PORTS = { scriptsShown: (): boolean => false, runningIds: NOTHING_LIVE, atom: SHARED_ATOMS_STUB };
