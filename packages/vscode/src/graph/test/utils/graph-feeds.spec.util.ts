import { vi } from 'vitest';

import type { ProgressListener } from '../../../run/common/run-progress.type.ts';
import type { Runs } from '../../../run/common/run.type.ts';
import { scriptsToggleMock } from '../../../shared/test/mocks/scripts-toggle.mock.ts';
import type { AffectedListener, AffectedView, SharedAffected } from '../../../tree/common/affected.type.ts';
import type { AtomListener, SharedAtoms } from '../../../tree/common/atom-load.type.ts';
import type { AtomLookup } from '../../../tree/common/atom-view.type.ts';
import type { PredictionListener, PredictionLookup, SharedPrediction } from '../../../tree/common/prediction.type.ts';
import { SHARED_AFFECTED_STUB } from '../../../tree/test/stubs/shared-affected.stub.ts';
import { SHARED_ATOMS_STUB } from '../../../tree/test/stubs/shared-atoms.stub.ts';
import { SHARED_PREDICTION_STUB } from '../../../tree/test/stubs/shared-prediction.stub.ts';
import type { GraphFeeds, GraphProgress, GraphToggles } from '../../common/graph.type.ts';
import type { AffectedFake, AtomsFake, PredictionFake, ProgressFake, ToggleFakes } from '../common/graph.type.ts';

/** Four fresh toggles: scripts, prediction and affected hidden, scope hidden unless `isScopeShown`. */
export const togglesOf = (isScopeShown = false): ToggleFakes => {
  const toggles: ToggleFakes = {
    scope: scriptsToggleMock(isScopeShown),
    scripts: scriptsToggleMock(),
    prediction: scriptsToggleMock(),
    affected: scriptsToggleMock()
  };

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

/** Shared prediction that reads `view`, records `packageShown` and tells its listeners when the spec says so. */
export const predictionFake = (view: PredictionLookup): PredictionFake => {
  const listeners = new Set<PredictionListener>();
  const packageShown = vi.fn<SharedPrediction['packageShown']>();
  const onDidChange = (listener: PredictionListener): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };
  const changed = (root: string): void => {
    for (const listener of listeners) listener(root, new Set());
  };
  const prediction: SharedPrediction = { ...SHARED_PREDICTION_STUB, view, packageShown, onDidChange };
  const fake: PredictionFake = { prediction, packageShown, changed, listenerCount: () => listeners.size };

  return fake;
};

/** Shared affected store that reads the view `setView` set (none at first), records `rootShown` and tells its listeners when the spec calls `changed`. */
export const affectedFake = (view: AffectedView | null = null): AffectedFake => {
  const listeners = new Set<AffectedListener>();
  const current = { view };
  const rootShown = vi.fn<SharedAffected['rootShown']>();
  const onDidChange = (listener: AffectedListener): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };
  const changed: AffectedListener = (root) => {
    for (const listener of listeners) listener(root);
  };
  const setView = (next: AffectedView | null): void => {
    current.view = next;
  };
  const affected: SharedAffected = { ...SHARED_AFFECTED_STUB, view: () => current.view, rootShown, onDidChange };
  const fake: AffectedFake = { affected, rootShown, changed, listenerCount: () => listeners.size, setView };

  return fake;
};

/** Feeds over `runs`, a progress with no records, atoms that never load and hidden toggles, unless a spec passes its own. */
export const feedsOf = (
  runs: Runs,
  atoms: SharedAtoms = SHARED_ATOMS_STUB,
  toggles: GraphToggles = togglesOf(),
  progress: GraphProgress = progressFake().progress
): GraphFeeds => {
  const prediction = predictionFake(() => null).prediction;
  const affected = affectedFake().affected;
  const feeds: GraphFeeds = { runs, progress, atoms, prediction, affected, toggles };

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
