import type { RowEntry, RowPlan } from '../common/widget.type.ts';

type StyleKey = 'transform' | 'width';

/** A CSSOM write, skipped when the element already has the value. */
export const writeStyle = (element: HTMLElement, key: StyleKey, value: string): void => {
  if (element.style[key] !== value) element.style[key] = value;
};

export const setHidden = (element: HTMLElement, isHidden: boolean): void => {
  if (element.hidden !== isHidden) element.hidden = isHidden;
};

/** Whole CSS px, so a 1 px border is not blurred over two device pixels. */
export const translateOf = (x: number, y: number): string => {
  const left = Math.round(x);
  const top = Math.round(y);

  return `translate(${left}px, ${top}px)`;
};

/** Shows and places a row from its plan, on whole px and at its scale; without one, or with one of the other kind, the row is hidden. The chevron, Focus folder and "…" hide as the plan says. */
export const placeRow = (entry: RowEntry, plan: RowPlan | undefined): void => {
  const { root, chevron, focus, ellipsis } = entry.elements;
  const isPlaced = plan?.kind === entry.kind;

  setHidden(root, !isPlaced);

  if (!isPlaced) return;

  const { x, y, width, scale } = plan.placement;
  const right = Math.round(x + width * scale);
  const left = Math.round(x);
  const translate = translateOf(x, y);
  const scaled = `${translate} scale(${scale})`;
  const transform = scale === 1 ? translate : scaled;

  writeStyle(root, 'transform', transform);
  writeStyle(root, 'width', `${(right - left) / scale}px`);
  setHidden(chevron, !plan.isChevronShown);
  setHidden(focus, !plan.isFocusShown);
  setHidden(ellipsis, !plan.isEllipsisShown);
};
