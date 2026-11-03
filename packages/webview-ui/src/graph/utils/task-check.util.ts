import type { GroupState } from '../common/graph-controls.type.ts';

/** `checked` when every id is chosen, `unchecked` when none is, else `mixed`; a chosen id outside `ids` never counts. */
export const checkStateOf = (ids: string[], chosen: ReadonlySet<string>): GroupState => {
  const picked = ids.filter((id) => chosen.has(id));

  if (picked.length === 0) return 'unchecked';

  return picked.length === ids.length ? 'checked' : 'mixed';
};
