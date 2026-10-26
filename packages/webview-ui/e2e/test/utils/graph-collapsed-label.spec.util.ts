import type { Page } from '@playwright/test';

import { measuredWidthsOf } from './graph-title-measure.spec.util.ts';
import { collapsedLabelOf } from '../../../src/graph/utils/collapsed-label.util.ts';

const ELLIPSIS = '…';

/** Every text `collapsedLabelOf` may measure for `title`: the title, then each of its code-point prefixes followed by "…". */
const candidatesOf = (title: string): string[] => {
  const points = [...title];
  const prefixOf = (_point: string, length: number): string => `${points.slice(0, length).join('')}${ELLIPSIS}`;
  const prefixes = points.map(prefixOf);

  return [title, ...prefixes];
};

/** The label the page draws on a collapsed folder titled `title` with `count` packages, its title measured in the page. */
export const collapsedLabelIn = async (page: Page, title: string, count: number): Promise<string> => {
  const widths = await measuredWidthsOf(page, candidatesOf(title));
  const measure = (text: string): number => {
    const width = widths.get(text);

    if (width === undefined) throw new Error(`graph e2e: '${text}' was not measured`);

    return width;
  };

  return collapsedLabelOf(title, count, measure);
};
