import type { Locator } from '@playwright/test';

import { expect, test } from './graph-task.fixture.ts';
import { TASK_MODE_NEW_HASH_STUB, TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { EXCLUDE_LABEL, FOCUS_LABEL, START_TRACE_LABEL } from '../src/graph/common/details.const.ts';
import { SHOW_TASKS_LABEL } from '../src/graph/common/graph-task.const.ts';

const D5 = { description: 'M5-1 U3d1 D5', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

/** Rendering rounds a grid track to a sub-pixel, so two equal columns may differ by a fraction. */
const TOLERANCE = 1;

/** The Details panel's button named exactly `name`. */
type ButtonOf = (name: string) => Locator;

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
};

const isNear = (left: number, right: number): boolean => Math.abs(left - right) <= TOLERANCE;

const boxOf = async (buttonOf: ButtonOf, name: string): Promise<Box> => {
  const box = await buttonOf(name).boundingBox();

  if (box === null) throw new Error(`graph e2e: the Details button ${name} has no box`);

  return box;
};

/** Four buttons in two equal columns: Focus over Start trace, Exclude over Show tasks. */
const twoByTwoOf = async (buttonOf: ButtonOf): Promise<boolean[]> => {
  const focus = await boxOf(buttonOf, FOCUS_LABEL);
  const exclude = await boxOf(buttonOf, EXCLUDE_LABEL);
  const startTrace = await boxOf(buttonOf, START_TRACE_LABEL);
  const showTasks = await boxOf(buttonOf, SHOW_TASKS_LABEL);
  const widths = [exclude.width, startTrace.width, showTasks.width];
  const isSameWidth = widths.every((width) => isNear(width, focus.width));
  const checks = [isNear(focus.x, startTrace.x), isNear(exclude.x, showTasks.x), isSameWidth, startTrace.y > focus.y];

  return checks;
};

/** Three buttons: Focus and Exclude share the first row, Start trace spans both columns below them. */
const orphanSpanOf = async (buttonOf: ButtonOf): Promise<boolean[]> => {
  const focus = await boxOf(buttonOf, FOCUS_LABEL);
  const exclude = await boxOf(buttonOf, EXCLUDE_LABEL);
  const startTrace = await boxOf(buttonOf, START_TRACE_LABEL);
  const rowWidth = exclude.x + exclude.width - focus.x;
  const checks = [isNear(focus.y, exclude.y), isNear(startTrace.width, rowWidth), startTrace.y > focus.y];

  return checks;
};

test.describe('FEATURE: Details package buttons in one grid', () => {
  test(
    'GIVEN app, a package with tasks, picked, its four action buttons sit in two equal columns',
    { annotation: D5 },
    async ({ graphHost, graphList, graphPage, graphProbe, graphTask }): Promise<void> => {
      const buttonOf = (name: string): Locator => graphTask.detailsButton(name);

      await test.step('WHEN the package graph is drawn and app is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
        await graphList.pick('app');
        await expect(graphTask.showTasksButton).toBeVisible();
      });

      await test.step('THEN Focus sits over Start trace and Exclude over Show tasks, all four as wide', async (): Promise<void> =>
        expect.poll(async (): Promise<boolean[]> => twoByTwoOf(buttonOf)).toStrictEqual([true, true, true, true]));
    }
  );

  test(
    'GIVEN docs, a package with no task, picked, Start trace spans the row under Focus and Exclude',
    { annotation: D5 },
    async ({ graphHost, graphList, graphPage, graphProbe, graphTask }): Promise<void> => {
      const buttonOf = (name: string): Locator => graphTask.detailsButton(name);

      await test.step('WHEN the package graph with docs is drawn and docs is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_NEW_HASH_STUB);
        await graphProbe.expectNodeIds([...PACKAGES, 'docs']);
        await graphList.pick('docs');
      });

      await test.step('THEN Show tasks is hidden', async (): Promise<void> => expect(graphTask.showTasksButton).toBeHidden());

      await test.step('AND Start trace is as wide as Focus and Exclude together, on its own row', async (): Promise<void> =>
        expect.poll(async (): Promise<boolean[]> => orphanSpanOf(buttonOf)).toStrictEqual([true, true, true]));
    }
  );
});
