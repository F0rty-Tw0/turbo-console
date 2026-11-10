import type { Manifest } from '@turbo-console/repo-gen';

import type { FilterPair } from '../common/filter-pair.type.ts';

const bareTasksOf = (manifest: Manifest, packageName: string): string[] => {
  const isBareTask = (task: Manifest['tasks'][number]): boolean => task.packageName === packageName && task.kind === 'task';

  return manifest.tasks.filter(isBareTask).map((task) => task.taskName);
};

const filterPairFor = (manifest: Manifest, owner: string, other: string): FilterPair | null => {
  const ownerTasks = bareTasksOf(manifest, owner);
  const otherTasks = bareTasksOf(manifest, other);
  const exclusive = ownerTasks.find((task) => !otherTasks.includes(task));
  const shared = ownerTasks.find((task) => otherTasks.includes(task));

  if (exclusive === undefined || shared === undefined) return null;

  const pair: FilterPair = { owner, other, exclusive, shared };

  return pair;
};

const isPair = (pair: FilterPair | null): pair is FilterPair => pair !== null;

/** The first package pair of `manifest` with an exclusive and a shared task; throws when the generator makes none. */
export const filterPairOf = (manifest: Manifest): FilterPair => {
  const names = manifest.packages.map((pkg) => pkg.name);
  const pairsOf = (owner: string): (FilterPair | null)[] => {
    const others = names.filter((other) => other !== owner);

    return others.map((other) => filterPairFor(manifest, owner, other));
  };
  const found = names.flatMap(pairsOf).find(isPair);

  if (found === undefined) throw new Error('no package pair with an exclusive and a shared task');

  return found;
};
