import type { ControlsElements, ControlsGroup, ControlsRow } from '../common/controls-elements.type.ts';
import type { ControlsActions } from '../common/graph-controls.type.ts';

const wireRow = (row: ControlsRow, actions: ControlsActions): void => {
  const { name, check, pick, focus } = row;

  check.addEventListener('input', (): void => actions.onRow(name, check.checked));
  pick.addEventListener('click', (): void => actions.onPick(name));
  focus.addEventListener('click', (): void => actions.onFocus(name));
};

const wireGroup = (group: ControlsGroup, actions: ControlsActions): void => {
  const names = group.rows.map((row) => row.name);

  group.check.addEventListener('input', (): void => actions.onGroup(names, group.check.checked));

  for (const row of group.rows) wireRow(row, actions);
};

/** Turns the panel's `input` and `click` events into `actions`; nothing else happens in a listener. */
export const wireControls = (elements: ControlsElements, actions: ControlsActions): void => {
  const { search, depth, tags, showAll, groups } = elements;

  search.addEventListener('input', (): void => actions.onSearch(search.value));
  depth.addEventListener('input', (): void => actions.onDepth(depth.value));
  depth.addEventListener('blur', (): void => actions.onDepthBlur());
  showAll.addEventListener('click', (): void => actions.onShowAll());

  for (const [tag, box] of tags) box.addEventListener('input', (): void => actions.onTag(tag, box.checked));

  for (const group of groups) wireGroup(group, actions);
};
