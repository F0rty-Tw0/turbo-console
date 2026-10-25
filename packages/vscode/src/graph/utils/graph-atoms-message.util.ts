import type { GraphAtomGroup, GraphAtomGroupState, GraphAtomOutcome, GraphAtomsMessage, GraphState } from '@turbo-console/webview-ui';

import type { AtomLookup, AtomView } from '../../tree/common/atom-view.type.ts';
import { umbrellaCounts } from '../../tree/utils/atom-text.util.ts';

const countsOf = (group: GraphAtomGroup, view: AtomView): string => {
  const known = view.groups.find((candidate) => candidate.umbrella.id === group.umbrellaId);

  if (known === undefined) return `${group.files.length} files`;

  return umbrellaCounts(known, view);
};

const outcomesOf = (group: GraphAtomGroup, view: AtomView): Record<string, GraphAtomOutcome> => {
  const entries = group.files.map(({ id }): [string, GraphAtomOutcome] => [id, view.results?.get(id)?.outcome ?? 'none']);

  return Object.fromEntries(entries);
};

/**
 * `null` unless `state` is a graph holding atom groups; a group whose umbrella is not a listed task has no package and is
 * left out, and `null` again when every group is.
 */
export const atomsMessageOf = (root: string, state: GraphState, view: AtomLookup): GraphAtomsMessage | null => {
  if (state.kind !== 'graph' || state.atomGroups.length === 0) return null;

  const groups: Record<string, GraphAtomGroupState> = {};

  for (const group of state.atomGroups) {
    const umbrella = state.tasks.find((task) => task.id === group.umbrellaId);

    if (umbrella === undefined) continue;

    const packageView = view(root, umbrella.packageName);

    groups[group.umbrellaId] = { counts: countsOf(group, packageView), files: outcomesOf(group, packageView) };
  }

  const isEmpty = Object.keys(groups).length === 0;

  if (isEmpty) return null;

  const message: GraphAtomsMessage = { type: 'atoms', groups };

  return message;
};
