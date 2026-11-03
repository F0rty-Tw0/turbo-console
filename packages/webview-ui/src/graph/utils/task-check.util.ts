import type { GroupState } from '../common/graph-controls.type.ts';

/** `checked` when every id is chosen, `unchecked` when none is, else `mixed`; a chosen id outside `ids` never counts. */
export const checkStateOf = (ids: string[], chosen: ReadonlySet<string>): GroupState => {
  const picked = ids.filter((id) => chosen.has(id));

  if (picked.length === 0) return 'unchecked';

  return picked.length === ids.length ? 'checked' : 'mixed';
};

/** The choice after a check on a line: `ids` added after the existing ids (check) or dropped (uncheck); other ids stay. */
export const chosenAfter = (chosen: string[], ids: string[], isChecked: boolean): string[] => {
  if (isChecked) {
    const chosenSet = new Set(chosen);
    const added = ids.filter((id) => !chosenSet.has(id));
    const next = [...chosen, ...added];

    return next;
  }

  const removed = new Set(ids);
  const next = chosen.filter((id) => !removed.has(id));

  return next;
};
