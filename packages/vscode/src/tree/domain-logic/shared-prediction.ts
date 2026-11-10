import type { WorkspaceModel } from '@turbo-console/core';

import { predictionListenersOf } from './prediction-listeners.ts';
import { PredictionLoads } from './prediction-loads.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { PredictionHostPorts, SharedPrediction } from '../common/prediction.type.ts';

/**
 * One `PredictionLoads` over `ports` and the models of `roots`, as `sharedAtomsOf` is for the Atomizer loads: every
 * change reaches each subscribed listener, and a throwing listener is logged so the ones after it still hear. The tree
 * and the graph share one `dispose`; after it the store starts nothing for a shown package or a toggle on.
 */
export const sharedPredictionOf = (roots: Roots, ports: PredictionHostPorts): SharedPrediction => {
  const subscribers = predictionListenersOf(ports.log);
  const modelOf = (root: string): WorkspaceModel | null => roots.get(root)?.state.model ?? null;
  const loads = new PredictionLoads({ ...ports, modelOf, changed: subscribers.changed });
  const packageShown = (root: string, packageName: string): void => {
    loads.packageShown(root, packageName);
  };
  const toggled = (shown: boolean): void => {
    loads.toggled(shown);
  };
  const runEnded = (root: string): void => {
    loads.runEnded(root);
  };
  const modelChanged = (change: RootChange): void => {
    loads.modelChanged(change);
  };
  const refreshAll = (): void => {
    loads.refreshAll();
  };
  const rootsKept = (kept: ReadonlySet<string>): void => {
    loads.rootsKept(kept);
  };
  const dispose = (): void => {
    subscribers.clear();
    loads.dispose();
  };
  const prediction: SharedPrediction = {
    view: loads.view,
    packageShown,
    toggled,
    runEnded,
    modelChanged,
    refreshAll,
    rootsKept,
    dispose,
    onDidChange: subscribers.onDidChange
  };

  return prediction;
};
