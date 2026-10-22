import type { ControlsElements } from '../common/controls-elements.type.ts';
import type { RestoredControls } from '../common/graph-controls.type.ts';

/**
 * Fills `next`'s inputs from `restored` and puts its panel at the front of `body`, or in place of `previous`'s.
 * Replacing a panel that held keyboard focus would drop it to `<body>`, so the new search box takes it.
 */
export const mountRestoredPanel = (
  body: HTMLElement,
  previous: ControlsElements | null,
  next: ControlsElements,
  restored: RestoredControls
): void => {
  next.search.value = restored.search;
  next.depth.value = String(restored.filters.depth);
  next.grouping.checked = restored.isGrouped;

  for (const [tag, box] of next.tags) box.checked = restored.filters.tags.has(tag);

  if (previous === null) {
    body.prepend(next.panel);

    return;
  }

  const hadFocus = previous.panel.contains(previous.panel.ownerDocument.activeElement);

  previous.panel.replaceWith(next.panel);

  if (hadFocus) next.search.focus();
};
