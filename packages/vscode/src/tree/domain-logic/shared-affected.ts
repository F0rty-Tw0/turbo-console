import type { WorkspaceModel } from '@turbo-console/core';

import { affectedListenersOf } from './affected-listeners.ts';
import { AffectedLoads } from './affected-loads.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { AffectedHostPorts, SharedAffected } from '../common/affected.type.ts';

/**
 * One `AffectedLoads` over `ports` and the models of `roots`, as `sharedPredictionOf` is for the cache prediction: every
 * change reaches each subscribed listener, and a throwing listener is logged so the ones after it still hear. The tree
 * and the graph share one `dispose`; the store guards against starting anything after it.
 */
export const sharedAffectedOf = (roots: Roots, ports: AffectedHostPorts): SharedAffected => {
  const subscribers = affectedListenersOf(ports.log);
  const modelOf = (root: string): WorkspaceModel | null => roots.get(root)?.state.model ?? null;
  const loads = new AffectedLoads({ ...ports, modelOf, changed: subscribers.changed });
  const rootShown = (root: string): void => {
    loads.rootShown(root);
  };
  const toggled = (shown: boolean): void => {
    loads.toggled(shown);
  };
  const modelChanged = (change: RootChange): void => {
    loads.modelChanged(change);
  };
  const rootsKept = (kept: ReadonlySet<string>): void => {
    loads.rootsKept(kept);
  };
  const dispose = (): void => {
    subscribers.clear();
    loads.dispose();
  };
  const affected: SharedAffected = {
    view: (root) => loads.view(root),
    status: (root) => loads.status(root),
    rootShown,
    toggled,
    modelChanged,
    rootsKept,
    dispose,
    onDidChange: subscribers.onDidChange
  };

  return affected;
};
