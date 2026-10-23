import { groupStateOf, isGroupLocked } from './controls-rules.util.ts';
import type { GroupState } from '../common/graph-controls.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { ShowFolderState } from '../common/widget.type.ts';

const CHECKED_OF: Record<GroupState, ShowFolderState['checked']> = {
  checked: 'true',
  unchecked: 'false',
  mixed: 'mixed'
};

/** The "Show folder" menu item: `aria-checked` and `aria-disabled` from the group checkbox's own rules. */
export const showFolderOf = (filters: GraphFilters, names: string[]): ShowFolderState => {
  const group = groupStateOf(filters, names);
  const isDisabled = isGroupLocked(filters, names);
  const state: ShowFolderState = { checked: CHECKED_OF[group], isDisabled };

  return state;
};

/** Activating the item checks every package unless they are all shown; from mixed it checks all. */
export const showFolderChecksOf = (state: ShowFolderState): boolean => state.checked !== 'true';
