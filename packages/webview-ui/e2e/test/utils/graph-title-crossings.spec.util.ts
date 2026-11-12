/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Page } from '@playwright/test';

import { lineSegmentsOf } from './graph-geometry.spec.util.ts';
import { crossesBox } from './graph-lines.spec.util.ts';
import type { ProbeLink, ProbeTitle } from '../../../src/graph/common/graph-probe-titles.type.ts';
import type { ProbeEdgeLine } from '../../../src/graph/common/graph-probe.type.ts';
import type { LinkEnds } from '../../common/playwright.type.ts';

/** The task mode package boxes and their titles the probe reports, in page pixels; runs in the page through `evaluate`. */
export const readBoxTitles = async (page: Page): Promise<ProbeTitle[]> =>
  page.evaluate((): ProbeTitle[] => window.__tcGraphProbe?.boxTitles() ?? []);

const isDrawnLine = (line: ProbeEdgeLine): boolean => line.isDrawn;

/** The ids of the titles whose label box meets a segment of a drawn line, edges included, in `titles` order. */
export const titleCrossingsOf = (titles: ProbeTitle[], lines: ProbeEdgeLine[]): string[] => {
  const segments = lines.filter(isDrawnLine).flatMap(lineSegmentsOf);
  const isCrossed = (title: ProbeTitle): boolean => segments.some((segment: LinkEnds): boolean => crossesBox(segment, title.label));

  return titles.filter(isCrossed).map((title): string => title.id);
};

const keyOf = (link: ProbeLink): string => `${link.source} > ${link.target}`;

/**
 * Whether `title` is drawn under `line` where the line meets its label box: the canvas draws the line after the box,
 * (its key in `over`), or the title has no opaque backdrop to hide the line behind it.
 */
const isHiddenBy = (title: ProbeTitle, over: ReadonlySet<string>, line: ProbeEdgeLine): boolean => {
  const isDrawnOver = title.backdrop === null || over.has(keyOf(line));
  const crosses = (segment: LinkEnds): boolean => crossesBox(segment, title.label);

  return isDrawnOver && lineSegmentsOf(line).some(crosses);
};

/**
 * The ids of the titles a drawn line crossing them makes hard to read, in `titles` order: a crossed title stays
 * readable only when drawn over the line, on its opaque backdrop.
 */
export const unreadableTitlesOf = (titles: ProbeTitle[], lines: ProbeEdgeLine[]): string[] => {
  const drawn = lines.filter(isDrawnLine);
  const isUnreadable = (title: ProbeTitle): boolean => {
    const over = new Set(title.linesOver.map(keyOf));

    return drawn.some((line): boolean => isHiddenBy(title, over, line));
  };

  return titles.filter(isUnreadable).map((title): string => title.id);
};
