import { expect, test } from './graph.fixture.ts';
import { GraphShots } from './pages/graph-shots.po.ts';
import { GraphTaskClock } from './pages/graph-task-clock.po.ts';
import { PageClock } from './pages/page-clock.po.ts';
import { THEME_DARK_STUB, THEME_HC_STUB, THEME_LIGHT_STUB } from './test/stubs/graph-theme.stub.ts';
import { TARGET_LIKE_CHOSEN_TASK, TARGET_LIKE_HUB_TASK } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskShotSetup } from './test/utils/graph-task-shot.spec.util.ts';

const THEMES = [
  { name: 'dark', theme: THEME_DARK_STUB },
  { name: 'light', theme: THEME_LIGHT_STUB },
  { name: 'high-contrast', theme: THEME_HC_STUB }
] as const;

const TASK_SETUP = taskShotSetup();

/** The chosen, selected task runs (the selected-run bar) and an unselected one failed (the plain bar). */
const TASK_RUNS_SHOT_STUB = { [TARGET_LIKE_CHOSEN_TASK]: 'running', [TARGET_LIKE_HUB_TASK]: 'failed' } as const;

/** `lib-3#build` has run 64 s: its row 2 draws `Running · 1m 4s`; `hub#build` (failed) has no clock. */
const TASK_RUNS_SHOT_ELAPSED = { [TARGET_LIKE_CHOSEN_TASK]: 64_000 } as const;

test.describe('FEATURE: theme screenshots of task run bars', () => {
  for (const { name, theme } of THEMES) {
    test(`GIVEN the ${name} theme, the selected running card clocked at 1m 4s and a failed card match task-runs-${name}.png`, async ({
      page
    }): Promise<void> => {
      const shots = new GraphShots(page);
      const clock = new PageClock(page);

      await test.step('GIVEN a page clock that runs until the canvas has settled', async (): Promise<void> => clock.installRunning());

      await test.step('WHEN the chosen task is laid out in task mode with its selection restored', async (): Promise<void> =>
        shots.openTasks(TASK_SETUP, theme));

      await test.step('AND the page clock stops', async (): Promise<void> => clock.pause());

      await test.step('AND runs arrive, the running card clocked at 64 s', async (): Promise<void> =>
        shots.sendRuns(TASK_RUNS_SHOT_STUB, TASK_RUNS_SHOT_ELAPSED));

      await test.step('THEN its row 2 reads Running · 1m 4s', async (): Promise<void> =>
        new GraphTaskClock(page).expectRowTwo(TARGET_LIKE_CHOSEN_TASK, 'Running · 1m 4s'));

      await test.step(`AND the page matches task-runs-${name}.png`, async (): Promise<void> =>
        expect(page).toHaveScreenshot(`task-runs-${name}.png`));
    });
  }
});
