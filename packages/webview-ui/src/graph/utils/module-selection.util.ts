import { endOf } from './module-end.util.ts';
import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { ModuleSelection, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';

const isHeld = (id: string, found: ModulesFound): boolean => {
  const end = endOf(id);

  if (end.kind === 'file') return found.files.includes(end.path);

  if (end.kind === 'stub') return found.stubs.includes(end.name);

  const under = `${end.path}/`;

  return found.files.some((file) => file.startsWith(under));
};

const keptSelectionOf = (selected: ModuleSelection | null, found: ModulesFound): ModuleSelection | null => {
  if (selected === null) return null;

  if (selected.kind === 'node') return isHeld(selected.id, found) ? selected : null;

  const bothHeld = isHeld(selected.source, found) && isHeld(selected.target, found);

  return bothHeld ? selected : null;
};

const keptFocusOf = (focus: string | null, found: ModulesFound): string | null => {
  if (focus === null) return null;

  return isHeld(focus, found) ? focus : null;
};

/** `view` with `selected` and `focus` set to null when `found` no longer holds them; every other field unchanged. */
export const keptViewOf = (view: ModulesViewState, found: ModulesFound): ModulesViewState => {
  const selected = keptSelectionOf(view.selected, found);
  const focus = keptFocusOf(view.focus, found);
  const kept: ModulesViewState = { ...view, selected, focus };

  return kept;
};
