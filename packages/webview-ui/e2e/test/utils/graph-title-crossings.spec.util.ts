/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Page } from '@playwright/test';

import { lineSegmentsOf } from './graph-geometry.spec.util.ts';
import { crossesBox } from './graph-lines.spec.util.ts';
import type { ProbeTitle } from '../../../src/graph/common/graph-probe-titles.type.ts';
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
