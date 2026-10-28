import type { FolderRowElements, RowButtonKind, RowPlan } from '../common/widget.type.ts';

/** A row's buttons in DOM order. */
const ROW_ORDER: RowButtonKind[] = ['chevron', 'title', 'focus', 'ellipsis'];

/** The buttons a placed row shows, in DOM order; the title shows on every placed row. */
export const shownKindsOf = (plan: RowPlan): RowButtonKind[] => {
  const isShown: Record<RowButtonKind, boolean> = {
    chevron: plan.isChevronShown,
    title: true,
    focus: plan.isFocusShown,
    ellipsis: plan.isEllipsisShown
  };

  return ROW_ORDER.filter((kind) => isShown[kind]);
};

/** The row's Tab stop: `preferred` while shown, else the first shown button (spec D9: the chevron, else the title). */
export const rowStopOf = (preferred: RowButtonKind, shown: RowButtonKind[]): RowButtonKind => {
  const isPreferredShown = shown.includes(preferred);

  if (isPreferredShown) return preferred;

  return shown[0] ?? 'title';
};

/** The button of `elements` that `target` is, `undefined` when it is none of them. */
export const kindOf = (elements: FolderRowElements, target: EventTarget | null): RowButtonKind | undefined =>
  ROW_ORDER.find((kind) => elements[kind] === target);
