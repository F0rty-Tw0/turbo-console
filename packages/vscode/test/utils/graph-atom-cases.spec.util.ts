import assert from 'node:assert/strict';

import type { GraphAtomGroup, GraphReady } from '@turbo-console/webview-ui';

import { lastGraphState, postedAtoms } from './graph-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { GraphScene } from '../common/graph.type.ts';
import type { ShownManifest, ShownTask } from '../common/launch.type.ts';

const COUNTS_BEFORE_LOAD = '10 files';

const COUNTS_AFTER_LOAD = /^10 files · \d+ cached/;

const isUmbrella = (task: ShownTask): boolean => task.kind === 'umbrella';

const isAggregateOf = (umbrella: ShownTask): ((task: ShownTask) => boolean) => {
  return (task) => task.kind === 'aggregate' && task.packageName === umbrella.packageName;
};

const isFileOf = (umbrella: ShownTask): ((task: ShownTask) => boolean) => {
  return (task) => task.kind === 'atom-file' && task.packageName === umbrella.packageName;
};

const isUnlisted = (task: ShownTask): boolean => task.kind !== 'task' || !task.visible;

const idOf = (task: ShownTask): string => task.fullName;

const byId = (left: ShownTask, right: ShownTask): number => left.fullName.localeCompare(right.fullName);

const requireOne = <Item>(items: Item[], what: string): Item => {
  const [first, ...rest] = items;

  if (first === undefined || rest.length > 0) throw new Error(`the fixture manifest needs exactly one ${what}`);

  return first;
};

/** The ids the files depend on outside the group: carrier, file and invisible task ids drop out; deduped and sorted. */
const outerDependenciesOf = (files: ShownTask[], manifest: ShownManifest): string[] => {
  const unlisted = manifest.tasks.filter(isUnlisted);
  const hidden = new Set(unlisted.map(idOf));
  const wanted = new Set<string>();

  for (const file of files) {
    for (const id of file.dependencies) {
      const isHidden = hidden.has(id);

      if (!isHidden) wanted.add(id);
    }
  }

  const ids = Array.from(wanted);

  return ids.toSorted();
};

const requireGroup = (state: GraphReady | null): GraphAtomGroup => {
  if (state === null) throw new Error('no graph state was posted');

  return requireOne(state.atomGroups, 'atom group in the graph state');
};

const countsOf = (api: TurboConsoleApi, root: string, umbrellaId: string): string[] => {
  const counts: string[] = [];

  for (const message of postedAtoms(api, root)) {
    const group = message.groups[umbrellaId];

    if (group !== undefined) counts.push(group.counts);
  }

  return counts;
};

const hasLoadedCounts = (counts: string[]): boolean => counts.some((text) => COUNTS_AFTER_LOAD.test(text));

/** The state lists an atom group as its umbrella only, posts its counts, and loads its package once the page shows the umbrella. */
export const atomGroupCase = async (scene: GraphScene): Promise<void> => {
  const { api, root, manifest } = scene;

  await step('L13-9: the task graph lists the atom group folded into its umbrella and posts its counts', async () => {
    const umbrella = requireOne(manifest.tasks.filter(isUmbrella), 'umbrella task');
    const filesOf = manifest.tasks.filter(isFileOf(umbrella));
    const files = filesOf.toSorted(byId);
    const aggregate = requireOne(manifest.tasks.filter(isAggregateOf(umbrella)), 'aggregate task');
    const state = lastGraphState(api, root);
    const group = requireGroup(state);
    const tasks = state?.tasks ?? [];
    const listed = new Map(tasks.map((task) => [task.id, task]));
    const isAggregateListed = listed.has(aggregate.fullName);
    const first = postedAtoms(api, root)[0];

    assert.equal(group.umbrellaId, umbrella.fullName);
    assert.deepEqual(
      group.files.map((file) => file.id),
      files.map(idOf)
    );
    assert.equal(isAggregateListed, false, 'aggregate listed');
    assert.deepEqual(listed.get(umbrella.fullName)?.dependencies, outerDependenciesOf(files, manifest));
    assert.equal(first?.groups[umbrella.fullName]?.counts, COUNTS_BEFORE_LOAD);

    await api.graph.receive(root, { type: 'shownUmbrellas', ids: [umbrella.fullName] });
    await waitFor('cached counts', () => hasLoadedCounts(countsOf(api, root, umbrella.fullName)));
  });
};
