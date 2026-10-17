import { test } from './details.fixture.ts';
import {
  PACKAGE_DETAILS_STUB,
  RUNNING_RUN_VIEW_STUB,
  RUN_VIEW_STUB,
  STOPPED_RUN_VIEW_STUB,
  TASK_CARD_STUB
} from './test/stubs/details-state.stub.ts';
import type { PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';

const AC6 = { description: 'AC6', type: 'requirement' };

const turboCard = (name: string): TaskCard => {
  const card: TaskCard = { ...TASK_CARD_STUB, taskId: `b#${name}`, name };

  return card;
};

const scriptCard = (name: string, run: RunView = RUN_VIEW_STUB): TaskCard => {
  const card: TaskCard = {
    ...TASK_CARD_STUB,
    taskId: `b#${name}`,
    name,
    definition: null,
    cacheStatus: null,
    isTurboTask: false,
    runCommand: `pnpm run ${name}`,
    run
  };

  return card;
};

/** Package `b` of the real-VS Code repro, its last card running; at `PAGE_WIDTH` × `PAGE_HEIGHT` the page scrolls. */
const SCROLLING_STATE: PackageDetails = {
  ...PACKAGE_DETAILS_STUB,
  packageName: 'b',
  tasks: [
    turboCard('build'),
    turboCard('lint'),
    scriptCard('a b'),
    scriptCard('check'),
    scriptCard('fmt'),
    scriptCard('long', RUNNING_RUN_VIEW_STUB)
  ]
};

const HIDDEN_KEPT_TASKS = [turboCard('build'), turboCard('lint'), turboCard('test'), turboCard('check')];

/** Package `b` with scripts hidden and the running script `long` kept last; a full state drops it when it ends. */
const HIDDEN_SCRIPTS_STATE: PackageDetails = {
  ...PACKAGE_DETAILS_STUB,
  packageName: 'b',
  scriptsShown: false,
  hiddenScriptCount: 3,
  tasks: [...HIDDEN_KEPT_TASKS, scriptCard('long', RUNNING_RUN_VIEW_STUB)]
};

const HIDDEN_SCRIPTS_ENDED_STATE: PackageDetails = { ...HIDDEN_SCRIPTS_STATE, tasks: HIDDEN_KEPT_TASKS };

const TWO_CARDS_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, packageName: 'b', tasks: [turboCard('one'), turboCard('two')] };

const PAGE_WIDTH = 1080;

const PAGE_HEIGHT = 500;

/** At this height, the title's scroll into view after the full state puts Run lint where Stop long was. */
const HIDDEN_SCRIPTS_PAGE_HEIGHT = 545;

/** The terminal panel's height in the repro: VS Code closes it with the run's last terminal, and the page grows by it. */
const PANEL_HEIGHT = 296;

test.describe('FEATURE: a layout shift holds pointer clicks on every Run/Stop button', () => {
  test(
    'GIVEN the page scrolled to the bottom, a click where Stop was does not run the card that slides there when the page grows',
    { annotation: AC6 },
    async ({ detailsPage, pageClock, pageViewport }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND is short enough to scroll', async (): Promise<void> => pageViewport.resize(PAGE_WIDTH, PAGE_HEIGHT));

      await test.step('AND shows package b with long running', async (): Promise<void> => detailsPage.open(SCROLLING_STATE));

      await test.step('AND is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

      await test.step('AND the spot of Stop long is noted', async (): Promise<void> => pageViewport.rememberSpotOf('Stop long'));

      await test.step('AND the page grows as the terminal panel closes', async (): Promise<void> =>
        pageViewport.resize(PAGE_WIDTH, PAGE_HEIGHT + PANEL_HEIGHT));

      await test.step('AND long ends stopped', async (): Promise<void> => detailsPage.sendRunState('b#long', STOPPED_RUN_VIEW_STUB));

      await test.step('THEN Run check sits where Stop long was', async (): Promise<void> =>
        pageViewport.expectButtonAtSpot('Run check'));

      await test.step('WHEN that spot is clicked', async (): Promise<void> => pageViewport.clickSpot());

      await test.step('THEN the page posted nothing', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));
    }
  );

  test(
    'GIVEN the page scrolled to the bottom, a click where Stop was right after the page grows, before any runState, runs nothing',
    { annotation: AC6 },
    async ({ detailsPage, pageClock, pageViewport }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND is short enough to scroll', async (): Promise<void> => pageViewport.resize(PAGE_WIDTH, PAGE_HEIGHT));

      await test.step('AND shows package b with long running', async (): Promise<void> => detailsPage.open(SCROLLING_STATE));

      await test.step('AND is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

      await test.step('AND the spot of Stop long is noted', async (): Promise<void> => pageViewport.rememberSpotOf('Stop long'));

      await test.step('AND the page grows as the terminal panel closes', async (): Promise<void> =>
        pageViewport.resize(PAGE_WIDTH, PAGE_HEIGHT + PANEL_HEIGHT));

      await test.step('THEN Run check sits where Stop long was', async (): Promise<void> =>
        pageViewport.expectButtonAtSpot('Run check'));

      await test.step('WHEN that spot is clicked', async (): Promise<void> => pageViewport.clickSpot());

      await test.step('THEN the page posted nothing', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));
    }
  );

  test(
    'GIVEN the page scrolled to the bottom, a click where Stop was that beats the page’s resize event runs nothing',
    { annotation: AC6 },
    async ({ detailsPage, pageClock, pageViewport }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND is short enough to scroll', async (): Promise<void> => pageViewport.resize(PAGE_WIDTH, PAGE_HEIGHT));

      await test.step('AND shows package b with long running', async (): Promise<void> => detailsPage.open(SCROLLING_STATE));

      await test.step('AND is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

      await test.step('AND the spot of Stop long is noted', async (): Promise<void> => pageViewport.rememberSpotOf('Stop long'));

      await test.step('AND the page grows as the terminal panel closes and that spot is clicked at once', async (): Promise<void> =>
        pageViewport.resizeAndClickSpot(PAGE_WIDTH, PAGE_HEIGHT + PANEL_HEIGHT));

      await test.step('THEN Run check sits where Stop long was', async (): Promise<void> =>
        pageViewport.expectButtonAtSpot('Run check'));

      await test.step('AND the page posted nothing', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));
    }
  );

  test(
    'GIVEN scripts hidden and the running script last, the held second click of a double-click on its Stop leaves focus off the Run that slid there',
    { annotation: AC6 },
    async ({ detailsPage, pageClock, pageViewport }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND is short enough to scroll', async (): Promise<void> =>
        pageViewport.resize(PAGE_WIDTH, HIDDEN_SCRIPTS_PAGE_HEIGHT));

      await test.step('AND shows package b with scripts hidden and long running', async (): Promise<void> =>
        detailsPage.open(HIDDEN_SCRIPTS_STATE));

      await test.step('AND is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

      await test.step('AND the spot of Stop long is noted', async (): Promise<void> => pageViewport.rememberSpotOf('Stop long'));

      await test.step('AND that spot is clicked', async (): Promise<void> => pageViewport.clickSpot());

      await test.step('AND the host drops long by a full state as its run ends', async (): Promise<void> =>
        detailsPage.sendState(HIDDEN_SCRIPTS_ENDED_STATE));

      await test.step('AND Run lint sits where Stop long was', async (): Promise<void> => pageViewport.expectButtonAtSpot('Run lint'));

      await test.step('AND that spot is clicked again', async (): Promise<void> => pageViewport.clickSpot());

      await test.step('THEN Run lint does not have focus', async (): Promise<void> =>
        detailsPage.card('lint').expectRunButtonUnfocused());

      await test.step('WHEN Enter is pressed', async (): Promise<void> => detailsPage.card('lint').pressEnter());

      await test.step('THEN the page posted the first click’s stop only', async (): Promise<void> =>
        detailsPage.expectPosted([{ type: 'ready' }, { type: 'stop', taskId: 'b#long' }]));
    }
  );

  test(
    'GIVEN scripts hidden and the running script last, a double-click on its Stop does not run the card the full state scrolls there',
    { annotation: AC6 },
    async ({ detailsPage, pageClock, pageViewport }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND is short enough to scroll', async (): Promise<void> =>
        pageViewport.resize(PAGE_WIDTH, HIDDEN_SCRIPTS_PAGE_HEIGHT));

      await test.step('AND shows package b with scripts hidden and long running', async (): Promise<void> =>
        detailsPage.open(HIDDEN_SCRIPTS_STATE));

      await test.step('AND is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

      await test.step('AND the spot of Stop long is noted', async (): Promise<void> => pageViewport.rememberSpotOf('Stop long'));

      await test.step('AND that spot is clicked', async (): Promise<void> => pageViewport.clickSpot());

      await test.step('AND the host drops long by a full state as its run ends', async (): Promise<void> =>
        detailsPage.sendState(HIDDEN_SCRIPTS_ENDED_STATE));

      await test.step('THEN Run lint sits where Stop long was', async (): Promise<void> =>
        pageViewport.expectButtonAtSpot('Run lint'));

      await test.step('WHEN that spot is clicked again', async (): Promise<void> => pageViewport.clickSpot());

      await test.step('THEN the page posted the first click’s stop only', async (): Promise<void> =>
        detailsPage.expectPosted([{ type: 'ready' }, { type: 'stop', taskId: 'b#long' }]));
    }
  );

  test(
    'GIVEN focus on another card’s Run, Enter right after a swap still runs that card',
    { annotation: AC6 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the cards one and two', async (): Promise<void> => detailsPage.open(TWO_CARDS_STATE));

      await test.step('AND Run two is focused', async (): Promise<void> => detailsPage.focusButton('Run two'));

      await test.step('AND one starts running', async (): Promise<void> => detailsPage.sendRunState('b#one', RUNNING_RUN_VIEW_STUB));

      await test.step('AND Enter is pressed right away', async (): Promise<void> => detailsPage.card('two').pressEnter());

      await test.step('THEN the page posts run for two', async (): Promise<void> =>
        detailsPage.expectPosted([{ type: 'ready' }, { type: 'run', taskId: 'b#two' }]));
    }
  );
});
