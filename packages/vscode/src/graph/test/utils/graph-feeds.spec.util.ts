import { vi } from 'vitest';

import type { ProgressListener } from '../../../run/common/run-progress.type.ts';
import type { Runs } from '../../../run/common/run.type.ts';
import { scriptsToggleMock } from '../../../shared/test/mocks/scripts-toggle.mock.ts';
import type { AtomListener, SharedAtoms } from '../../../tree/common/atom-load.type.ts';
import type { AtomLookup } from '../../../tree/common/atom-view.type.ts';
import { SHARED_ATOMS_STUB } from '../../../tree/test/stubs/shared-atoms.stub.ts';
import type { GraphFeeds, GraphProgress, GraphToggles } from '../../common/graph.type.ts';
import type { AtomsFake, ProgressFake, ToggleFakes } from '../common/graph.type.ts';

/** Two fresh toggles: scripts hidden, scope hidden unless `isScopeShown`. */
export const togglesOf = (isScopeShown = false): ToggleFakes => {
  const toggles: ToggleFakes = { scope: scriptsToggleMock(isScopeShown), scripts: scriptsToggleMock() };

  return toggles;
};

/** A task progress with no records until the spec sets `recordsOf`, that tells its listeners when the spec calls `changed`. */
export const progressFake = (): ProgressFake => {
  const listeners = new Set<ProgressListener>();
  const recordsOf = vi.fn<GraphProgress['recordsOf']>().mockReturnValue([]);
  const onDidChange = (listener: ProgressListener): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };
  const changed: ProgressListener = (root) => {
    for (const listener of listeners) listener(root);
  };
  const progress: GraphProgress = { recordsOf, onDidChange };
  const fake: ProgressFake = { progress, recordsOf, changed, listenerCount: () => listeners.size };

  return fake;
};

/** Feeds over `runs`, a progress with no records, atoms that never load and hidden toggles, unless a spec passes its own. */
export const feedsOf = (
  runs: Runs,
  atoms: SharedAtoms = SHARED_ATOMS_STUB,
  toggles: GraphToggles = togglesOf(),
  progress: GraphProgress = progressFake().progress
): GraphFeeds => {
  const feeds: GraphFeeds = { runs, progress, atoms, toggles };

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
