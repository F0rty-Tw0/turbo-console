import { IMPORTS_FOLD_AT } from '../common/details-imports.const.ts';
import type { ImportsDetails } from '../common/details-view.type.ts';
import type {
  ModuleDetailsBlock,
  ModuleDetailsElements,
  ModuleDetailsFocusKey,
  ModuleDetailsList,
  ModuleDetailsView
} from '../common/module-details.type.ts';

/** What Focus on `view` focuses: a file's or stub's id; `null` for a view with no Focus. */
export const focusTargetOf = (view: ModuleDetailsView): string | null => {
  if (view.kind === 'file' || view.kind === 'stub') return view.id;

  return null;
};

/** Whether `view` shows the saved focus, so its Focus reads Clear focus. */
export const isFocusedOf = (view: ModuleDetailsView, focus: string | null): boolean => {
  const target = focusTargetOf(view);

  return target !== null && target === focus;
};

const blockKeyOf = (block: ModuleDetailsBlock, active: Element): ModuleDetailsFocusKey => {
  const { list, details } = block;
  const row = details.rows.find((each) => each.button === active);

  if (row !== undefined) {
    const rowKey: ModuleDetailsFocusKey = { part: 'row', list, site: row.site.key };

    return rowKey;
  }

  const part = active === details.more ? 'more' : 'scan';
  const key: ModuleDetailsFocusKey = { part, list, site: null };

  return key;
};

/** Where `active` sits in `elements`; any focus in a block but on a row or Show more counts as Scan again; `null` outside the view. */
export const focusKeyOf = (elements: ModuleDetailsElements, active: Element | null): ModuleDetailsFocusKey | null => {
  if (active === null) return null;

  const isInside = elements.root.contains(active);

  if (!isInside) return null;

  const block = elements.blocks.find((each) => each.details.root.contains(active));

  if (block !== undefined) return blockKeyOf(block, active);

  const part = active === elements.focus ? 'focus' : 'heading';
  const key: ModuleDetailsFocusKey = { part, list: null, site: null };

  return key;
};

const blockDetailsOf = (elements: ModuleDetailsElements, list: ModuleDetailsList | null): ImportsDetails | null => {
  const block = elements.blocks.find((each) => each.list === list);

  return block?.details ?? null;
};

/** The same row by `site.key`, or the first row past the fold for Show more; `null` when there is no block or no such row. */
const rowTwinOf = (details: ImportsDetails | null, key: ModuleDetailsFocusKey): HTMLButtonElement | null => {
  if (details === null) return null;

  if (key.part === 'more') return details.rows[IMPORTS_FOLD_AT]?.button ?? null;

  const row = details.rows.find((each) => each.site.key === key.site);

  return row?.button ?? null;
};

/**
 * The element of `elements` that takes focus held at `key` in the view it replaced: the same row of the same list, else
 * the first row past the fold for Show more, else that list's Scan again, else Focus, else the heading; `null` when the
 * view draws none of them.
 */
export const twinOf = (elements: ModuleDetailsElements, key: ModuleDetailsFocusKey): HTMLElement | null => {
  const { focus, heading } = elements;

  if (key.part === 'heading') return heading;

  const details = blockDetailsOf(elements, key.list);
  const row = rowTwinOf(details, key);
  const scanAgain = details?.scanAgain ?? null;
  const candidates = [row, scanAgain, focus, heading];

  return candidates.find((candidate) => candidate !== null) ?? null;
};
