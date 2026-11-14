import { test } from './graph-task.fixture.ts';
import { GraphTaskCards } from './pages/graph-task-cards.po.ts';
import { GraphTaskClock } from './pages/graph-task-clock.po.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const CLOCK = { description: 'G2-5b AC6, AC7', type: 'requirement' };

const CHOSEN = 'app#build';

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

/** The spec numbers written out, so a changed constant cannot move the oracle with it. */
const CARD = { width: 180, height: 60 };

/** `Running · 59m 59s` (narrower than D5's `Continuous · 59m 59s`) and `Continuous · 99h 59m` (a D5 sample): neither may widen the 180 px card. */
const AT_59M59S = 3_599_000;

const AT_99H59M = 359_940_000;

/** 1 h 2 min 3 s: the hour format drops the seconds. */
const AT_1H2M3S = 3_723_000;

/** Wider than the word `Running` alone (about 55 px), so the box measured the clock too. */
const CLOCKED_LABEL_PX = 70;

test.describe('FEATURE: graph task card clock', () => {
  test.beforeEach(async ({ graphFlow, graphHost, graphPage, graphTaskProbe, pageClock }): Promise<void> => {
    await pageClock.install();
    await graphPage.open({ savedState: taskSavedState(TASK_MODE_STATE_STUB.hash, { chosen: [CHOSEN] }) });
    await graphHost.sendState(TASK_MODE_STATE_STUB);
    await graphFlow.waitForLayout();
    await graphTaskProbe.expectTaskIds(CHAIN);
  });

  test(
    'GIVEN app#build running for 64 s, row 2 reads 1m 4s, 1m 5s after a second, Passed even with a stale base, and no interval once the bases go',
    { annotation: CLOCK },
    async ({ page, pageClock }): Promise<void> => {
      const clock = new GraphTaskClock(page);
      const cards = new GraphTaskCards(page);

      await test.step('WHEN runs arrive with app#build running for 64 s', async (): Promise<void> => {
        await clock.sendRuns({ [CHOSEN]: 'running' }, { [CHOSEN]: 64_000 });
      });

      await test.step('THEN row 2 reads Running · 1m 4s on a 180 x 60 card, with one interval armed', async (): Promise<void> => {
        await clock.expectRowTwo(CHOSEN, 'Running · 1m 4s');
        await cards.expectCardSize(CHOSEN, CARD);
        await pageClock.expectIntervals(1);
      });

      await test.step('WHEN the page clock moves 1000 ms', async (): Promise<void> => pageClock.tick(1000));

      await test.step('THEN row 2 reads Running · 1m 5s, its box fits the label and its block starts one padding in', async (): Promise<void> => {
        await clock.expectRowTwo(CHOSEN, 'Running · 1m 5s');
        await cards.expectLabelBoxFits(CHOSEN, CLOCKED_LABEL_PX);
        await cards.expectBlockLeftEdge(CHOSEN);
      });

      await test.step('WHEN the run ends in a message that still names a base', async (): Promise<void> => {
        await clock.sendRuns({ [CHOSEN]: 'passed' }, { [CHOSEN]: 70_000 });
      });

      await test.step('THEN row 2 reads Passed, never Passed · 1m 10s, and the interval stays', async (): Promise<void> => {
        await clock.expectRowTwo(CHOSEN, 'Passed');
        await pageClock.expectIntervals(1);
      });

      // row 2 already read `Passed`, so the next message changes the word too: the read waits until the page handled it
      await test.step('WHEN the next message names no elapsed', async (): Promise<void> => clock.sendRuns({ [CHOSEN]: 'failed' }));

      await test.step('THEN row 2 reads Failed and no interval is left', async (): Promise<void> => {
        await clock.expectRowTwo(CHOSEN, 'Failed');
        await pageClock.expectIntervals(0);
      });
    }
  );

  test(
    'GIVEN app#build continuous for 1h 2m 3s, row 2 reads Continuous · 1h 2m and 1h 3m a minute later',
    { annotation: CLOCK },
    async ({ page, pageClock }): Promise<void> => {
      const clock = new GraphTaskClock(page);
      const cards = new GraphTaskCards(page);

      await test.step('WHEN runs arrive with app#build continuous for 1h 2m 3s', async (): Promise<void> => {
        await clock.sendRuns({ [CHOSEN]: 'continuous' }, { [CHOSEN]: AT_1H2M3S });
      });

      await test.step('THEN row 2 reads Continuous · 1h 2m on a 180 x 60 card', async (): Promise<void> => {
        await clock.expectRowTwo(CHOSEN, 'Continuous · 1h 2m');
        await cards.expectCardSize(CHOSEN, CARD);
      });

      await test.step('WHEN the page clock moves a minute', async (): Promise<void> => pageClock.tick(60_000));

      await test.step('THEN row 2 reads Continuous · 1h 3m', async (): Promise<void> =>
        clock.expectRowTwo(CHOSEN, 'Continuous · 1h 3m'));
    }
  );

  test(
    'GIVEN the two widest clock samples, the card stays 180 x 60 and its block starts one padding in; a message with no elapsed drops the clock',
    { annotation: CLOCK },
    async ({ page, pageClock }): Promise<void> => {
      const clock = new GraphTaskClock(page);
      const cards = new GraphTaskCards(page);

      await test.step('WHEN app#build is running for 59m 59s', async (): Promise<void> => {
        await clock.sendRuns({ [CHOSEN]: 'running' }, { [CHOSEN]: AT_59M59S });
      });

      await test.step('THEN row 2 reads Running · 59m 59s on a 180 x 60 card, its block one padding in', async (): Promise<void> => {
        await clock.expectRowTwo(CHOSEN, 'Running · 59m 59s');
        await cards.expectCardSize(CHOSEN, CARD);
        await cards.expectBlockLeftEdge(CHOSEN);
      });

      await test.step('WHEN app#build is continuous for 99h 59m', async (): Promise<void> => {
        await clock.sendRuns({ [CHOSEN]: 'continuous' }, { [CHOSEN]: AT_99H59M });
      });

      await test.step('THEN row 2 reads Continuous · 99h 59m on a 180 x 60 card, its block one padding in', async (): Promise<void> => {
        await clock.expectRowTwo(CHOSEN, 'Continuous · 99h 59m');
        await cards.expectCardSize(CHOSEN, CARD);
        await cards.expectBlockLeftEdge(CHOSEN);
      });

      await test.step('WHEN a new base replaces the old one (a relaunch or a drift fix)', async (): Promise<void> => {
        await clock.sendRuns({ [CHOSEN]: 'running' }, { [CHOSEN]: 5000 });
      });

      await test.step('THEN row 2 reads Running · 5s', async (): Promise<void> => clock.expectRowTwo(CHOSEN, 'Running · 5s'));

      await test.step('WHEN runs arrive with app#build running and no elapsed', async (): Promise<void> => {
        await clock.sendRuns({ [CHOSEN]: 'running' });
      });

      await test.step('THEN row 2 reads Running and no interval is left', async (): Promise<void> => {
        await clock.expectRowTwo(CHOSEN, 'Running');
        await pageClock.expectIntervals(0);
      });
    }
  );
});
