import type { Locator } from '@playwright/test';

import { expect, test } from './graph-task.fixture.ts';
import { TASK_MODE_NEW_HASH_STUB, TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { EXCLUDE_LABEL, FOCUS_LABEL, START_TRACE_LABEL } from '../src/graph/common/details.const.ts';
import { SHOW_MODULES_LABEL } from '../src/graph/common/graph-module.const.ts';
import { SHOW_TASKS_LABEL } from '../src/graph/common/graph-task.const.ts';

const D5 = { description: 'M5-1 U3d1 D5', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

const ROW_LABELS = [FOCUS_LABEL, EXCLUDE_LABEL, START_TRACE_LABEL, SHOW_TASKS_LABEL, SHOW_MODULES_LABEL];

/** Rendering rounds a grid track to a sub-pixel, so two equal columns may differ by a fraction. */
const TOLERANCE = 1;

const TWO_BY_TWO = { focusOverStartTrace: true, excludeOverFourth: true, isSameWidth: true, isStartTraceBelow: true };

const ORPHAN_SPAN = { isFirstBesideSecond: true, isLastRowWide: true, isLastBelow: true };

/** The three buttons left shown once Focus is hidden too, in grid order. */
const SHIFTED_LABELS: [string, string, string] = [EXCLUDE_LABEL, START_TRACE_LABEL, SHOW_MODULES_LABEL];

/** The Details panel's button named exactly `name`. */
type ButtonOf = (name: string) => Locator;

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
};

type Checks = Record<string, boolean>;

const isNear = (left: number, right: number): boolean => Math.abs(left - right) <= TOLERANCE;

const boxOf = async (buttonOf: ButtonOf, name: string): Promise<Box> => {
  const box = await buttonOf(name).boundingBox();

  if (box === null) throw new Error(`graph e2e: the Details button ${name} has no box`);

  return box;
};

/** Four buttons in two equal columns: Focus over Start trace, Exclude over the fourth, Show tasks unless named. */
const twoByTwoOf = async (buttonOf: ButtonOf, fourthLabel = SHOW_TASKS_LABEL): Promise<Checks> => {
  const focus = await boxOf(buttonOf, FOCUS_LABEL);
  const exclude = await boxOf(buttonOf, EXCLUDE_LABEL);
  const startTrace = await boxOf(buttonOf, START_TRACE_LABEL);
  const fourth = await boxOf(buttonOf, fourthLabel);
  const widths = [exclude.width, startTrace.width, fourth.width];
  const isSameWidth = widths.every((width) => isNear(width, focus.width));
  const focusOverStartTrace = isNear(focus.x, startTrace.x);
  const excludeOverFourth = isNear(exclude.x, fourth.x);
  const checks: Checks = { focusOverStartTrace, excludeOverFourth, isSameWidth, isStartTraceBelow: startTrace.y > focus.y };

  return checks;
};

/** Three shown buttons: the first two share the first row, the last spans both columns below them. */
const orphanSpanOf = async (buttonOf: ButtonOf, labels: [string, string, string]): Promise<Checks> => {
  const [firstLabel, secondLabel, lastLabel] = labels;
  const first = await boxOf(buttonOf, firstLabel);
  const second = await boxOf(buttonOf, secondLabel);
  const last = await boxOf(buttonOf, lastLabel);
  const rowWidth = second.x + second.width - first.x;
  const isFirstBesideSecond = isNear(first.y, second.y);
  const isLastRowWide = isNear(last.width, rowWidth);
  const checks: Checks = { isFirstBesideSecond, isLastRowWide, isLastBelow: last.y > first.y };

  return checks;
};

/** Sets `hidden` on the button, as the Details render does for a package with no visible task. */
const hideButton = async (button: Locator): Promise<void> => {
  await button.evaluate((element): void => element.setAttribute('hidden', ''));
};

/** Each row button's icon is shown, or each is hidden. */
const expectRowIcons = async (buttonOf: ButtonOf, isShown: boolean): Promise<void> => {
  for (const label of ROW_LABELS) {
    const icon = buttonOf(label).locator('.codicon');

    await expect(icon, `the ${label} icon`).toBeVisible({ visible: isShown });
  }
};

test.describe('FEATURE: Details package buttons in one grid', () => {
  test(
    'GIVEN app, a package with tasks, picked, its first four action buttons sit in two equal columns',
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
        expect.poll(async (): Promise<Checks> => twoByTwoOf(buttonOf)).toStrictEqual(TWO_BY_TWO));
    }
  );

  test(
    'GIVEN docs, a package with no task, picked, Start trace sits beside Show modules under Focus and Exclude',
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

      await test.step('AND Focus sits over Start trace and Exclude over Show modules, all four as wide', async (): Promise<void> =>
        expect.poll(async (): Promise<Checks> => twoByTwoOf(buttonOf, SHOW_MODULES_LABEL)).toStrictEqual(TWO_BY_TWO));

      await test.step('WHEN Focus is hidden as well, before the hidden Show tasks', async (): Promise<void> =>
        hideButton(buttonOf(FOCUS_LABEL)));

      await test.step('THEN Exclude and Start trace share the first row and Show modules spans the row below', async (): Promise<void> => {
        const shifted = async (): Promise<Checks> => orphanSpanOf(buttonOf, SHIFTED_LABELS);

        await expect.poll(shifted).toStrictEqual(ORPHAN_SPAN);
      });
    }
  );

  test(
    'GIVEN app picked, the action icons show at the default Details width and hide at its 200px minimum',
    { annotation: D5 },
    async ({ graphHost, graphList, graphPage, graphProbe, graphSashes, graphTask }): Promise<void> => {
      const buttonOf = (name: string): Locator => graphTask.detailsButton(name);

      await test.step('WHEN the package graph is drawn and app is picked', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
        await graphList.pick('app');
        await graphSashes.expectPanelWidth('graph-details', 280);
      });

      await test.step('THEN each row button shows its icon', async (): Promise<void> => expectRowIcons(buttonOf, true));

      await test.step('WHEN Details gets Home', async (): Promise<void> => {
        await graphSashes.press('details', 'Home');
        await graphSashes.expectPanelWidth('graph-details', 200);
      });

      await test.step('THEN each row button hides its icon', async (): Promise<void> => expectRowIcons(buttonOf, false));

      await test.step('AND each row button keeps its label', async (): Promise<void> => {
        for (const label of ROW_LABELS) await expect(buttonOf(label)).toBeVisible();
      });
    }
  );
});
