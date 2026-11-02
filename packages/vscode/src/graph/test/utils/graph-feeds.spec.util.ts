import { vi } from 'vitest';

import type { Runs } from '../../../run/common/run.type.ts';
import { scriptsToggleMock } from '../../../shared/test/mocks/scripts-toggle.mock.ts';
import type { AtomListener, SharedAtoms } from '../../../tree/common/atom-load.type.ts';
import type { AtomLookup } from '../../../tree/common/atom-view.type.ts';
import { SHARED_ATOMS_STUB } from '../../../tree/test/stubs/shared-atoms.stub.ts';
import type { GraphFeeds, GraphToggles } from '../../common/graph.type.ts';
import type { AtomsFake } from '../common/graph.type.ts';

/** Two fresh toggles, both hidden: the stored default of scope and scripts. */
export const hiddenTogglesOf = (): GraphToggles => {
  const toggles: GraphToggles = { scope: scriptsToggleMock(), scripts: scriptsToggleMock() };

  return toggles;
};

/** Two fresh toggles, scope shown and scripts hidden. */
export const scopeShownTogglesOf = (): GraphToggles => {
  const toggles: GraphToggles = { scope: scriptsToggleMock(true), scripts: scriptsToggleMock() };

  return toggles;
};

/** Feeds over `runs`, atoms that never load and hidden toggles, unless a spec passes its own. */
export const feedsOf = (runs: Runs, atoms: SharedAtoms = SHARED_ATOMS_STUB, toggles: GraphToggles = hiddenTogglesOf()): GraphFeeds => {
  const feeds: GraphFeeds = { runs, atoms, toggles };

  return feeds;
};

/** Feeds over `runs` and `toggles`, with atoms that never load. */
export const feedsWithToggles = (runs: Runs, toggles: GraphToggles): GraphFeeds => feedsOf(runs, SHARED_ATOMS_STUB, toggles);

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
