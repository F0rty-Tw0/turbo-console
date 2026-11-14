import { expect, test } from './graph.fixture.ts';
import { GraphShots } from './pages/graph-shots.po.ts';
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

test.describe('FEATURE: theme screenshots of task run bars', () => {
  for (const { name, theme } of THEMES) {
    test(`GIVEN the ${name} theme, the selected running card and a failed card match task-runs-${name}.png`, async ({
      page
    }): Promise<void> => {
      const shots = new GraphShots(page);

      await test.step('WHEN the chosen task is laid out in task mode with its selection restored', async (): Promise<void> =>
        shots.openTasks(TASK_SETUP, theme));

      await test.step('AND runs arrive', async (): Promise<void> => shots.sendRuns(TASK_RUNS_SHOT_STUB));

      await test.step(`THEN the page matches task-runs-${name}.png`, async (): Promise<void> =>
        expect(page).toHaveScreenshot(`task-runs-${name}.png`));
    });
  }
});
