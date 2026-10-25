import type { WorkspaceModel } from '@turbo-console/core';

import { AtomLoads } from './atom-loads.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { AtomHostPorts, AtomListener, SharedAtoms } from '../common/atom-load.type.ts';
import type { AtomView } from '../common/atom-view.type.ts';

/**
 * One `AtomLoads` over `ports` and the models of `roots` (spec 3.2): every load change reaches each subscribed listener.
 * The loads' rules are its own; this only fans out `changed`.
 */
export const sharedAtomsOf = (roots: Roots, ports: AtomHostPorts): SharedAtoms => {
  const listeners = new Set<AtomListener>();
  const changed: AtomListener = (root, packageName) => {
    for (const listener of listeners) listener(root, packageName);
  };
  const modelOf = (root: string): WorkspaceModel | null => roots.get(root)?.state.model ?? null;
  const loads = new AtomLoads({ ...ports, changed }, modelOf);
  const view = (root: string, packageName: string): AtomView => loads.view(root, packageName);
  const childrenRequested = (root: string, packageName: string): void => {
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
