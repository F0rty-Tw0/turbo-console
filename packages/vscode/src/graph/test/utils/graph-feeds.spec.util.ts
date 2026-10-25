import { vi } from 'vitest';

import type { Runs } from '../../../run/common/run.type.ts';
import type { AtomListener, SharedAtoms } from '../../../tree/common/atom-load.type.ts';
import type { AtomLookup } from '../../../tree/common/atom-view.type.ts';
import { SHARED_ATOMS_STUB } from '../../../tree/test/stubs/shared-atoms.stub.ts';
import type { GraphFeeds } from '../../common/graph.type.ts';
import type { AtomsFake } from '../common/graph.type.ts';

/** Feeds over `runs` and atoms that never load, unless a spec passes its own. */
export const feedsOf = (runs: Runs, atoms: SharedAtoms = SHARED_ATOMS_STUB): GraphFeeds => {
  const feeds: GraphFeeds = { runs, atoms };

  return feeds;
};

/** Shared atoms that read `view`, record `childrenRequested` and tell their listeners when the spec says so. */
export const atomsFake = (view: AtomLookup): AtomsFake => {
  const listeners = new Set<AtomListener>();
  const childrenRequested = vi.fn<SharedAtoms['childrenRequested']>();
  const onDidChange = (listener: AtomListener): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };
  const changed: AtomListener = (root, packageName) => {
    for (const listener of listeners) listener(root, packageName);
  };
  const atoms: SharedAtoms = { ...SHARED_ATOMS_STUB, view, childrenRequested, onDidChange };
  const fake: AtomsFake = { atoms, childrenRequested, changed, listenerCount: () => listeners.size };

  return fake;
};
