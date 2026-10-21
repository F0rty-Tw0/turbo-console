import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';

/** Whether a same-hash state changed any package's task count; a package of `next` with no counterpart counts as a change. */
export const taskCountsDiffer = (previous: GraphPackage[], next: GraphPackage[]): boolean => {
  const counts = new Map<string, number>();

  for (const info of previous) counts.set(info.name, info.taskCount);

  const isChanged = (info: GraphPackage): boolean => counts.get(info.name) !== info.taskCount;

  return next.some(isChanged);
};
