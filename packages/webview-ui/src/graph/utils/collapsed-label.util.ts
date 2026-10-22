import { pluralOf } from './plural.util.ts';
import { COLLAPSED_LABEL_MAX_PX } from '../common/graph.const.ts';

const ELLIPSIS = '…';

const fits = (text: string, measure: (text: string) => number): boolean => measure(text) <= COLLAPSED_LABEL_MAX_PX;

/** The title, or its longest code-point prefix whose `prefix + '…'` fits; `'…'` when none does. */
const shortTitleOf = (title: string, measure: (text: string) => number): string => {
  const titleFits = fits(title, measure);

  if (titleFits) return title;

  const points = [...title];

  for (let length = points.length - 1; length > 0; length -= 1) {
    const prefix = points.slice(0, length).join('');
    const candidate = `${prefix}${ELLIPSIS}`;

    const candidateFits = fits(candidate, measure);

    if (candidateFits) return candidate;
  }

  return ELLIPSIS;
};

/** The collapsed node's two-line label: the title cut to fit `COLLAPSED_LABEL_MAX_PX`, then the package count. */
export const collapsedLabelOf = (title: string, count: number, measure: (text: string) => number): string => {
  const shortTitle = shortTitleOf(title, measure);
  const packages = pluralOf(count, 'package', 'packages');

  return `${shortTitle}\n${packages}`;
};
