import { atomGroupsOf } from '@turbo-console/core';
import type { WorkspaceModel } from '@turbo-console/core';

import type { AtomLookup, AtomView } from '../common/atom-view.type.ts';
import { NO_ATOMS } from '../common/atom.const.ts';

const viewsOf = (model: WorkspaceModel): ReadonlyMap<string, AtomView> => {
  const views = new Map<string, AtomView>();

  for (const group of atomGroupsOf(model)) {
    const known = views.get(group.packageName)?.groups ?? [];

    views.set(group.packageName, { groups: [...known, group], dryRun: null, results: null });
  }

  return views;
};

/**
 * Atomizer views read from the model alone: groups, no dry run, no results. Each model is grouped once per lookup, so
 * a caller that builds the lookup per build recomputes the groups per build.
 */
export const staticAtomLookup = (modelOf: (root: string) => WorkspaceModel | null): AtomLookup => {
  const cache = new WeakMap<WorkspaceModel, ReadonlyMap<string, AtomView>>();

  return (root, packageName) => {
    const model = modelOf(root);

    if (model === null) return NO_ATOMS;

    const views = cache.get(model) ?? viewsOf(model);

    cache.set(model, views);

    return views.get(packageName) ?? NO_ATOMS;
  };
};
