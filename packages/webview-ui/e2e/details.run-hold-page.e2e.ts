import { expect, test } from './details.fixture.ts';
import {
  PACKAGE_DETAILS_STUB,
  RUNNING_RUN_VIEW_STUB,
  RUN_VIEW_STUB,
  STOPPED_RUN_VIEW_STUB,
  TASK_CARD_STUB
} from './test/stubs/details-state.stub.ts';
import type { PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';
import { RUN_SWAP_HOLD_MS } from '../src/details/common/run-view.const.ts';

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

/** Two turbo cards and two script cards: two rows of two at 1100 px, a stack of four at 320 px. */
const FOUR_CARDS_STATE: PackageDetails = {
  ...PACKAGE_DETAILS_STUB,
  packageName: 'b',
  tasks: [turboCard('one'), turboCard('two'), scriptCard('three'), scriptCard('four')]
};

/** An ended run whose status text, 101 characters, overflows the status line at both swap widths. */
const LONG_STOPPED_RUN_VIEW: RunView = {
  ...STOPPED_RUN_VIEW_STUB,
  text: 'stopped · 3.0s · a status text long enough to overflow the status line of a card at either swap width'
};

/** Two columns of cards, and the narrowest panel. */
const SWAP_PAGE_WIDTHS = [1100, 320];

const SWAP_PAGE_HEIGHT = 800;

/**
 * Two columns of cards: two 26em (416 px) columns, their 12 px gap and the 32 px body padding need 876 px. The scripts
 * `a b | check` and `fmt | long` then share rows, so Run check sits one row straight above Stop long.
 */
const PAGE_WIDTH = 1080;

/**
 * `SCROLLING_STATE` at `PAGE_WIDTH` is 916 px tall, and a script row is 197 px (a 185 px card plus the 12 px gap), all
 * measured in the harness on Linux. At 916 − 197 px the page scrolls by one row; once the panel closes it fits, so its
 * content slides down that row and puts the centre of Run check exactly where the centre of Stop long was.
 */
const PAGE_HEIGHT = 719;

/**
 * One column of cards, under the 876 px of `PAGE_WIDTH`: in two, the script `long` sits alone in the left column and
 * Run lint in the right one, so no scroll could slide Run lint under Stop long.
 */
const HIDDEN_SCRIPTS_PAGE_WIDTH = 800;

/**
 * At this height, the title's scroll into view after the full state puts Run lint where Stop long was. Measured in the
 * harness on Linux at `HIDDEN_SCRIPTS_PAGE_WIDTH`: `HIDDEN_SCRIPTS_STATE` is 1655 px tall and the centre of Stop long
 * sits 182 px above its end, so scrolled to the bottom it shows at 672 − 182 = 490 px. The full state scrolls the page
 * back to its top, where the centre of Run lint sits at 490 px.
 */
const HIDDEN_SCRIPTS_PAGE_HEIGHT = 672;

/** The terminal panel's height in the repro: VS Code closes it with the run's last terminal, and the page grows by it. */
const PANEL_HEIGHT = 296;

/** A click this long after a hold ends lands well clear of it. */
const AFTER_HOLD_MS = 100;

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

      await test.step('AND can keep a resize event from its listeners', async (): Promise<void> =>
        pageViewport.installResizeCatcher());

      await test.step('AND is short enough to scroll', async (): Promise<void> => pageViewport.resize(PAGE_WIDTH, PAGE_HEIGHT));

      await test.step('AND shows package b with long running', async (): Promise<void> => detailsPage.open(SCROLLING_STATE));

      await test.step('AND is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

      await test.step('AND the spot of Stop long is noted', async (): Promise<void> => pageViewport.rememberSpotOf('Stop long'));

      await test.step('AND the page grows as the terminal panel closes and that spot is clicked before the page sees the resize', async (): Promise<void> =>
        pageViewport.resizeUnseenAndClickSpot(PAGE_WIDTH, PAGE_HEIGHT + PANEL_HEIGHT));

      await test.step('THEN Run check sits where Stop long was', async (): Promise<void> =>
        pageViewport.expectButtonAtSpot('Run check'));

      await test.step('AND the page posted nothing', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));
    }
  );

  test(
    'GIVEN a resize long past, a pointer click on a Run runs its card',
    { annotation: AC6 },
    async ({ detailsPage, pageClock, pageViewport }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the cards one and two', async (): Promise<void> => detailsPage.open(TWO_CARDS_STATE));

      await test.step('AND the page grows as the terminal panel closes', async (): Promise<void> =>
        pageViewport.resize(PAGE_WIDTH, PAGE_HEIGHT + PANEL_HEIGHT));

      await test.step('AND the hold passes', async (): Promise<void> => pageClock.tick(RUN_SWAP_HOLD_MS + AFTER_HOLD_MS));

      await test.step('AND Run one is clicked', async (): Promise<void> => detailsPage.card('one').runButton.click());

      await test.step('THEN the page posts run for one', async (): Promise<void> =>
        detailsPage.expectPosted([{ type: 'ready' }, { type: 'run', taskId: 'b#one' }]));
    }
  );

  test(
    'GIVEN scripts hidden and the running script last, the held second click of a double-click on its Stop leaves focus off the Run that slid there',
    { annotation: AC6 },
    async ({ detailsPage, pageClock, pageViewport }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND is short enough to scroll', async (): Promise<void> =>
        pageViewport.resize(HIDDEN_SCRIPTS_PAGE_WIDTH, HIDDEN_SCRIPTS_PAGE_HEIGHT));

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
        pageViewport.resize(HIDDEN_SCRIPTS_PAGE_WIDTH, HIDDEN_SCRIPTS_PAGE_HEIGHT));

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

  test(
    'GIVEN the cards one and two, a pointer click on Run two right after one starts running still runs two',
    { annotation: AC6 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the cards one and two', async (): Promise<void> => detailsPage.open(TWO_CARDS_STATE));

      await test.step('AND one starts running', async (): Promise<void> => detailsPage.sendRunState('b#one', RUNNING_RUN_VIEW_STUB));

      await test.step('THEN one shows Stop', async (): Promise<void> =>
        expect(detailsPage.card('one').runButton).toHaveAttribute('aria-label', 'Stop one'));

      await test.step('WHEN Run two is clicked right away', async (): Promise<void> => detailsPage.card('two').runButton.click());

      await test.step('THEN the page posts run for two', async (): Promise<void> =>
        detailsPage.expectPosted([{ type: 'ready' }, { type: 'run', taskId: 'b#two' }]));
    }
  );

  for (const width of SWAP_PAGE_WIDTHS) {
    test(
      `GIVEN a long status text at ${String(width)} px, a Run → Stop → Run swap changes no card’s height or position`,
      { annotation: AC6 },
      async ({ detailsPage, pageLayout, pageViewport }): Promise<void> => {
        await test.step('WHEN the page has the width under test', async (): Promise<void> =>
          pageViewport.resize(width, SWAP_PAGE_HEIGHT));

        await test.step('AND shows the cards one to four', async (): Promise<void> => detailsPage.open(FOUR_CARDS_STATE));

        await test.step('AND every card’s box is noted', async (): Promise<void> => pageLayout.rememberCardRects());

        await test.step('AND one starts running', async (): Promise<void> => detailsPage.sendRunState('b#one', RUNNING_RUN_VIEW_STUB));

        await test.step('THEN one shows Stop', async (): Promise<void> =>
          expect(detailsPage.card('one').runButton).toHaveAttribute('aria-label', 'Stop one'));

        await test.step('AND every card keeps its box', async (): Promise<void> => pageLayout.expectCardRectsKept());

        await test.step('WHEN one ends stopped with a long status text', async (): Promise<void> =>
          detailsPage.sendRunState('b#one', LONG_STOPPED_RUN_VIEW));

        await test.step('THEN one shows the long status text', async (): Promise<void> =>
          detailsPage.card('one').expectRunTextTooltip(LONG_STOPPED_RUN_VIEW.text));

        await test.step('AND the run text is cut off instead of wrapping', async (): Promise<void> =>
          pageLayout.card('one').expectRunTextTruncated());

        await test.step('AND the status stays one line tall', async (): Promise<void> => pageLayout.card('one').expectStatusOneLine());

        await test.step('AND one shows Run', async (): Promise<void> =>
          expect(detailsPage.card('one').runButton).toHaveAttribute('aria-label', 'Run one'));

        await test.step('AND every card still keeps its box', async (): Promise<void> => pageLayout.expectCardRectsKept());
      }
    );
  }
});
