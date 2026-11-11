import type { SharedAffected } from '../../common/affected.type.ts';

/** Shared affected store that never loads: every root reads as absent, and no listener ever hears. */
export const SHARED_AFFECTED_STUB: SharedAffected = {
  view: () => null,
  status: () => 'absent',
  rootShown: () => undefined,
  toggled: () => undefined,
  modelChanged: () => undefined,
  rootsKept: () => undefined,
  dispose: () => undefined,
  onDidChange: () => () => undefined
};
