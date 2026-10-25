import type { AtomFile, AtomGroup } from '@turbo-console/core';

const SEPARATOR = '\0';

const taskIdOf = (file: AtomFile): string => file.task.id;

/** The task id of every file of `groups`. */
export const atomFileIds = (groups: AtomGroup[]): string[] => {
  const perGroup = groups.map((group) => group.files.map(taskIdOf));

  return perGroup.flat();
};

/** The umbrella and file ids of `groups`, sorted and joined: equal keys mean the same rows. */
export const atomIdsKey = (groups: AtomGroup[]): string => {
  const umbrellaIds = groups.map((group) => group.umbrella.id);
  const fileIds = atomFileIds(groups);
  const ids = [...umbrellaIds, ...fileIds];

  return ids.toSorted().join(SEPARATOR);
};
