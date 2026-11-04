import type { ProgressOwner } from '../../common/run-progress.type.ts';

export const PROGRESS_OWNER_STUB: ProgressOwner = { root: '/ws', taskId: 'web#build', launchedAt: 1000 };

export const DEPENDENCIES_STUB: ReadonlyMap<string, string[]> = new Map([
  ['web#build', ['ui#build']],
  ['ui#build', ['tokens#build']]
]);
