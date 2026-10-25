import type { WorkspaceModel } from '@turbo-console/core';

import { AtomLoads } from './atom-loads.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { AtomHostPorts, AtomListener, SharedAtoms } from '../common/atom-load.type.ts';
import type { AtomView } from '../common/atom-view.type.ts';

/**
 * One `AtomLoads` over `ports` and the models of `roots` (spec 3.2): every load change reaches each subscribed listener.
 * The loads' rules are its own; this only fans out `changed`. A throwing listener is logged, so the ones after it still
 * hear the change and the throw never rejects the load's settle callback. After `dispose` a request starts no load: the
 * tree and the graph share one `dispose`, and `AtomLoads` would start a dry run nobody aborts.
 */
export const sharedAtomsOf = (roots: Roots, ports: AtomHostPorts): SharedAtoms => {
  const listeners = new Set<AtomListener>();
  let isDisposed = false;
  const tell = (listener: AtomListener, root: string, packageName: string): void => {
    try {
      listener(root, packageName);
    } catch (error) {
      const line = `atoms ${root} ${packageName}: listener failed: ${logTextOf(error)}`;

      ports.log(logTextOf(line));
    }
  };
  const changed: AtomListener = (root, packageName) => {
    for (const listener of listeners) tell(listener, root, packageName);
  };
  const modelOf = (root: string): WorkspaceModel | null => roots.get(root)?.state.model ?? null;
  const loads = new AtomLoads({ ...ports, changed }, modelOf);
  const view = (root: string, packageName: string): AtomView => loads.view(root, packageName);
  const childrenRequested = (root: string, packageName: string): void => {
    if (isDisposed) return;

    loads.childrenRequested(root, packageName);
  };
  const runEnded = (root: string, packageName: string): void => {
    loads.runEnded(root, packageName);
  };
  const refreshAll = (): void => {
    loads.refreshAll();
  };
  const modelChanged = (root: string, model: WorkspaceModel | null): void => {
    loads.modelChanged(root, model);
  };
  const rootsKept = (kept: ReadonlySet<string>): void => {
    loads.rootsKept(kept);
  };
  const dispose = (): void => {
    isDisposed = true;
    listeners.clear();
    loads.dispose();
  };
  const onDidChange = (listener: AtomListener): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };
  const atoms: SharedAtoms = { view, childrenRequested, runEnded, refreshAll, modelChanged, rootsKept, dispose, onDidChange };

  return atoms;
};
