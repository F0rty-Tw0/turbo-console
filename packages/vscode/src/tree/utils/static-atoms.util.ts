import { atomGroupsOf } from '@turbo-console/core';
import type { WorkspaceModel } from '@turbo-console/core';

import type { AtomLookup, AtomView } from '../common/atom-view.type.ts';
import { NO_ATOMS } from '../common/atom.const.ts';

const viewsOf = (model: WorkspaceModel): ReadonlyMap<string, AtomView> => {
  const views = new Map<string, AtomView>();

  for (const group of atomGroupsOf(model)) {
    const known = views.get(group.packageName)?.groups ?? [];

    const groups = [...known, group];
    const view: AtomView = { groups, dryRun: null, results: null };

    views.set(group.packageName, view);
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

    const cached = cache.get(model);
    const views = cached ?? viewsOf(model);

    if (cached === undefined) cache.set(model, views);

    return views.get(packageName) ?? NO_ATOMS;
  };
};
