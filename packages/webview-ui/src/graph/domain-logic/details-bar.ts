import type { PageElements } from '../common/graph-page.type.ts';

/** Clear selection enabled and the Details bar shown while something is selected; both off while nothing is. */
export const setClearEnabled = (page: Pick<PageElements, 'clear' | 'detailsBar'>, isEnabled: boolean): void => {
  page.clear.disabled = !isEnabled;
  page.detailsBar.hidden = !isEnabled;
};
