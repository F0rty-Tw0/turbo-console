import { test } from '@playwright/test';
import type { Browser } from '@playwright/test';

import { collectSamples, expectRecorded } from './bench/bench-record.ts';
import { stretchLarge, stretchOpen, stretchPan, stretchToggleMs } from './bench/bench-stretch.ts';
import { MEDIUM_EXPANDED, STRETCH_ROWS } from './bench/common/stretch.const.ts';
import { noteAnnotation } from './bench/utils/bench-results.util.ts';
import { fitNoteOf } from './bench/utils/stretch-view.util.ts';
import { STRETCH_UMBRELLAS } from './test/utils/graph-stretch.spec.util.ts';

/** The first frame of one cold open; its Fit is noted for the report. */
const openedFirstFrameMs = async (browser: Browser): Promise<number> => {
  const sample = await stretchOpen(browser);
  const note = noteAnnotation(fitNoteOf(sample.fit));

  test.info().annotations.push(note);

  return sample.firstFrameMs;
};

test.describe('FEATURE: graph stretch', () => {
  test('GIVEN the stretch state, a cold open with every group collapsed records the first frame of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => openedFirstFrameMs(browser);

    await test.step('WHEN a fresh page opens it in task mode once per sample', async (): Promise<number[]> =>
      collectSamples(STRETCH_ROWS.smallOpen, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(STRETCH_ROWS.smallOpen));
  });

  test('GIVEN the stretch state with every group collapsed, a 2 s pan records the median frame time of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => stretchPan(browser, 0);

    await test.step('WHEN it is framed by Fit and panned once per sample', async (): Promise<number[]> =>
      collectSamples(STRETCH_ROWS.smallPan, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(STRETCH_ROWS.smallPan));
  });

  test('GIVEN the stretch state with five groups expanded, a 2 s pan records the median frame time of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => stretchPan(browser, MEDIUM_EXPANDED);

    await test.step('WHEN five groups are expanded, Fit frames the graph and it is panned once per sample', async (): Promise<
      number[]
    > => collectSamples(STRETCH_ROWS.mediumPan, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(STRETCH_ROWS.mediumPan));
  });

  test('GIVEN the stretch state with five groups expanded, toggling the sixth records the median toggle time of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => stretchToggleMs(browser);

    await test.step('WHEN the sixth group is expanded and collapsed once per sample', async (): Promise<number[]> =>
      collectSamples(STRETCH_ROWS.mediumToggle, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(STRETCH_ROWS.mediumToggle));
  });

  test('GIVEN the stretch state with all groups expanded, a 2 s pan records the median frame time and the heap of every sample', async ({
    browser
  }): Promise<void> => {
    const measure = async (): Promise<number> => {
      const sample = await stretchLarge(browser);
      const note = noteAnnotation(`stretch L heap ${sample.heapMb.toFixed(1)} MB`);

      test.info().annotations.push(note);

      return sample.frameMs;
    };

    await test.step(`WHEN all ${STRETCH_UMBRELLAS.length} groups are expanded, Fit frames the graph and it is panned once per sample`, async (): Promise<
      number[]
    > => collectSamples(STRETCH_ROWS.largePan, measure));

    await test.step('THEN every sample is recorded', (): void => expectRecorded(STRETCH_ROWS.largePan));
  });
});
