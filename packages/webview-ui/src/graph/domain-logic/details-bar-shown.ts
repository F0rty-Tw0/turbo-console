import type { PageElements } from '../common/graph-page.type.ts';

/** The Details bar shown with Clear selection enabled while something is selected; hidden with Clear disabled while nothing is. */
export const showDetailsBar = (page: Pick<PageElements, 'clear' | 'detailsBar'>, isShown: boolean): void => {
  page.clear.disabled = !isShown;
  page.detailsBar.hidden = !isShown;
};
