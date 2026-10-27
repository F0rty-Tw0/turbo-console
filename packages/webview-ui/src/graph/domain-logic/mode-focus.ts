import type { PageElements } from '../common/graph-page.type.ts';

/** Where focus falls back when task mode or a panel lets it go: Packages, or Controls while the mode group is hidden. */
export const modeFocusOf = (page: Pick<PageElements, 'modeGroup' | 'controls' | 'packagesMode'>): HTMLButtonElement => {
  const { modeGroup, controls, packagesMode } = page;

  return modeGroup.hidden ? controls : packagesMode;
};
