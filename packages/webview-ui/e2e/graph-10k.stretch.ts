import { test } from '@playwright/test';
import type { Browser } from '@playwright/test';

import { collectSamples, expectRecorded, recordNote } from './bench/bench-record.ts';
import { tenKModulesOpen, tenKModulesPan } from './bench/bench-stretch-10k-modules.ts';
import { tenKGroupedPan, tenKOpen, tenKPan, tenKToggleMs, tenKZoom } from './bench/bench-stretch-10k.ts';
import type { BenchRowDef, StretchPan, TenKOpen, TenKPan } from './bench/common/bench.type.ts';
import { TEN_K_ROWS } from './bench/common/stretch-10k.const.ts';
import { panNoteOf } from './bench/utils/stretch-note.util.ts';
import { tenKTasksSavedState, tenKTasksState } from './test/utils/graph-10k-tasks.spec.util.ts';
import { tenKFlatSavedState, tenKGroupedSavedState, tenKPackagesState } from './test/utils/graph-10k.spec.util.ts';

/** One 10k row: the test's GIVEN, the step's WHEN, and one sample's measure. */
type TenKCase = {
  readonly row: BenchRowDef;
  readonly given: string;
  readonly when: string;
  readonly measure: (browser: Browser) => Promise<number>;
};

/** Notes the engine behind an open (`fallback` means ELK ran past `FALLBACK_TIMEOUT_MS`) and returns its first frame. */
const openedMs = (row: BenchRowDef, open: TenKOpen): number => {
  recordNote(`${row.name} layout ${open.engine}`);

  return open.firstFrameMs;
};

/** Notes the longest long task of a pan or zoom and returns its p95 frame. */
const movedMs = (row: BenchRowDef, pan: StretchPan): number => {
  recordNote(panNoteOf(row.name, pan));

  return pan.p95Ms;
};

/** Notes the engine and the longest long task of a pan or zoom and returns its p95 frame. */
const laidOutMovedMs = (row: BenchRowDef, moved: TenKPan): number => {
  recordNote(`${row.name} layout ${moved.engine}`);

  return movedMs(row, moved.pan);
};

const {
  flatOpen,
  flatPan,
  flatZoom,
  groupedOpen,
  groupedPan,
  expandedPan,
  groupedToggle,
  taskOpen,
  taskPan,
  modulesOpen,
  modulesPan
} = TEN_K_ROWS;

const CASES: TenKCase[] = [
  {
    row: flatOpen,
    given: 'GIVEN 10,000 packages flat, a cold open records the first frame of every sample',
    when: 'WHEN a fresh page opens it once per sample',
    measure: async (browser): Promise<number> => openedMs(flatOpen, await tenKOpen(browser, tenKFlatSavedState(), tenKPackagesState()))
  },
  {
    row: flatPan,
    given: 'GIVEN 10,000 packages flat, a 2 s pan records the p95 frame time of every sample',
    when: 'WHEN it is framed by Fit and panned once per sample',
    measure: async (browser): Promise<number> =>
      laidOutMovedMs(flatPan, await tenKPan(browser, tenKFlatSavedState(), tenKPackagesState()))
  },
  {
    row: flatZoom,
    given: 'GIVEN 10,000 packages flat, a 2 s wheel zoom records the p95 frame time of every sample',
    when: 'WHEN it is framed by Fit and wheeled in and back out once per sample',
    measure: async (browser): Promise<number> =>
      laidOutMovedMs(flatZoom, await tenKZoom(browser, tenKFlatSavedState(), tenKPackagesState()))
  },
  {
    row: groupedOpen,
    given: 'GIVEN 10,000 packages in 50 collapsed folders, a cold open records the first frame of every sample',
    when: 'WHEN a fresh page opens it once per sample',
    measure: async (browser): Promise<number> =>
      openedMs(groupedOpen, await tenKOpen(browser, tenKGroupedSavedState(true), tenKPackagesState()))
  },
  {
    row: groupedPan,
    given: 'GIVEN 10,000 packages in 50 collapsed folders, a 2 s pan records the p95 frame time of every sample',
    when: 'WHEN it is framed by Fit and panned from a spot no box covers once per sample',
    measure: async (browser): Promise<number> => laidOutMovedMs(groupedPan, await tenKGroupedPan(browser, true))
  },
  {
    row: expandedPan,
    given: 'GIVEN 10,000 packages in 50 expanded folders, a 2 s pan records the p95 frame time of every sample',
    when: 'WHEN it is framed by Fit and panned from a spot no box covers once per sample',
    measure: async (browser): Promise<number> => laidOutMovedMs(expandedPan, await tenKGroupedPan(browser, false))
  },
  {
    row: groupedToggle,
    given: 'GIVEN 10,000 packages in 50 collapsed folders, toggling the first records the median toggle time of every sample',
    when: 'WHEN the first folder is expanded and collapsed through its list button once per sample',
    measure: async (browser): Promise<number> => tenKToggleMs(browser)
  },
  {
    row: taskOpen,
    given: 'GIVEN 10,000 tasks with Show every task, a cold open records the first frame of every sample',
    when: 'WHEN a fresh page opens it in task mode once per sample',
    measure: async (browser): Promise<number> => openedMs(taskOpen, await tenKOpen(browser, tenKTasksSavedState(), tenKTasksState()))
  },
  {
    row: taskPan,
    given: 'GIVEN 10,000 tasks with Show every task, a 2 s pan records the p95 frame time of every sample',
    when: 'WHEN it is framed by Fit and panned once per sample',
    measure: async (browser): Promise<number> =>
      laidOutMovedMs(taskPan, await tenKPan(browser, tenKTasksSavedState(), tenKTasksState()))
  },
  {
    row: modulesOpen,
    given: 'GIVEN a 5000-file modules payload, opening modules mode records the first frame of every sample',
    when: 'WHEN a fresh page opens in modules mode and the payload is answered once per sample',
    measure: async (browser): Promise<number> => tenKModulesOpen(browser)
  },
  {
    row: modulesPan,
    given: 'GIVEN a 5000-file modules payload drawn at D9, a 2 s pan records the p95 frame time of every sample',
    when: 'WHEN the fitted view is panned from a spot clear of its leaves once per sample',
    measure: async (browser): Promise<number> => movedMs(modulesPan, await tenKModulesPan(browser))
  }
];

test.describe('FEATURE: graph stretch at 10k', () => {
  for (const { row, given, when, measure } of CASES) {
    test(given, async ({ browser }): Promise<void> => {
      const sampled = async (): Promise<number> => measure(browser);

      await test.step(when, async (): Promise<number[]> => collectSamples(row, sampled));

      await test.step('THEN every sample is recorded', (): void => expectRecorded(row));
    });
  }
});
