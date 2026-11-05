import type { WorkspaceModel } from '@turbo-console/core';

import { graphListingOf } from './graph-tasks.util.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { DependenciesOf } from '../../run/common/run-progress.type.ts';

const NO_DEPENDENCIES: string[] = [];

/** The listed dependencies of every listed task of `model`, as they are now (spec D3, D10); `[]` for any other id. */
export const dependenciesOfModel = (model: WorkspaceModel | null): DependenciesOf => {
  if (model === null) return () => NO_DEPENDENCIES;

  const { tasks } = graphListingOf(model);
  const pairs = tasks.map((task): [string, string[]] => [task.id, task.dependencies]);
  const edges = new Map(pairs);

  return (id) => edges.get(id) ?? NO_DEPENDENCIES;
};

/**
 * Spec D10's snapshot, taken once per run: the closure answers for the model `root` has at that moment, for the run's
 * whole life.
 */
export const runDependenciesOf = (roots: Roots): ((root: string) => DependenciesOf) => {
  return (root: string): DependenciesOf => {
    const model = roots.get(root)?.state.model ?? null;

    return dependenciesOfModel(model);
  };
};
