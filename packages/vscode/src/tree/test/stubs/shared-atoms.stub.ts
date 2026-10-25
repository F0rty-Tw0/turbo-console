import type { SharedAtoms } from '../../common/atom-load.type.ts';
import { NO_ATOMS } from '../../common/atom.const.ts';

/** Shared loads that never load: every package reads as having no Atomizer groups, and no listener ever hears. */
export const SHARED_ATOMS_STUB: SharedAtoms = {
  view: () => NO_ATOMS,
  childrenRequested: () => undefined,
  runEnded: () => undefined,
  refreshAll: () => undefined,
  modelChanged: () => undefined,
  rootsKept: () => undefined,
  dispose: () => undefined,
  onDidChange: () => () => undefined
};
