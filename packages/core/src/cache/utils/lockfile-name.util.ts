import type { LockfileName } from '../../workspace/common/workspace-model.type.ts';
import { LOCKFILE_NAMES } from '../common/cache.const.ts';

/** Whether `name` is one of the lockfiles turbo supports. */
export const isLockfileName = (name: string): name is LockfileName => {
  return LOCKFILE_NAMES.some((lockfile) => lockfile === name);
};
