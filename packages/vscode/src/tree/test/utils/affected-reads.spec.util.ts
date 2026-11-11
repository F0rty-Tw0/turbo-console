import type { AffectedStatus, AffectedView, SharedAffected } from '../../common/affected.type.ts';

/** The reads of a root that always answers `view`, `loaded` unless the status is given. */
export const readsOf = (view: AffectedView | null, status: AffectedStatus = 'loaded'): Pick<SharedAffected, 'view' | 'status'> => {
  const reads: Pick<SharedAffected, 'view' | 'status'> = { view: () => view, status: () => status };

  return reads;
};
