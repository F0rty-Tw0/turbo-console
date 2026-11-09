import { test } from './resize-stall.fixture.ts';

const WIDTH = 400;
const HEIGHT = 300;

/** A wait that never ends runs to the test timeout; one that gives up fails well before it. */
const BOUNDED_TIMEOUT_MS = 15_000;

/** An on-time resize returns in a frame or two; one that sat out the 5 s wait for a late event takes longer. */
const ON_TIME_RESIZE_MS = 2000;

const POINTER_MOVE_NOTE =
  /^released by mouse\.move \(leaves the pointer at \(1,1\)\): resize wanted \{"width":400,"height":300\} after \d+ ms, page \{.*\}; nudges: layout, mouse\.move/u;

const POINTER_MOVE_WARNING = /^F-U8-8 released by mouse\.move /u;

const THROWN_NUDGE_NOTE = /^released by mouse\.move .*; nudges: layout threw: .*layout read blocked.*, mouse\.move/u;

const NO_EVENT_ERROR = /^F-U8-8: no resize event, even after every nudge: resize wanted/u;

const UNANSWERED_ERROR = /^F-U8-8: page stopped answering evaluate after 5000 ms: resize wanted \{"width":400,"height":300\}, /u;

test.describe('FEATURE: a resize waits for the page’s resize event, bounded and self-diagnosing (F-U8-8)', () => {
  test('GIVEN the resize event arrives, the resize returns at once and notes nothing', async ({
    pageClock,
    resizeStall
  }): Promise<void> => {
    await test.step('WHEN the page has a paused fake clock', async (): Promise<void> => pageClock.install());

    await test.step('AND is open', async (): Promise<void> => resizeStall.open());

    await test.step('AND is resized', async (): Promise<void> => resizeStall.resize(WIDTH, HEIGHT));

    await test.step('THEN the resize returned well inside the wait', (): void => resizeStall.expectResizeUnder(ON_TIME_RESIZE_MS));

    await test.step('AND no F-U8-8 note is recorded', (): void => resizeStall.expectNotes([]));

    await test.step('AND no F-U8-8 line is warned', (): void => resizeStall.expectWarnings([]));
  });

  test('GIVEN a stalled resize event that a pointer move releases, the resize notes that nudge', async ({
    pageClock,
    resizeStall
  }): Promise<void> => {
    await test.step('WHEN the page has a paused fake clock', async (): Promise<void> => pageClock.install());

    await test.step('AND gets no real resize event', async (): Promise<void> => resizeStall.swallowResizeEvents());

    await test.step('AND gets one on a pointer move', async (): Promise<void> => resizeStall.resizeOnPointerMove());

    await test.step('AND is open', async (): Promise<void> => resizeStall.open());

    await test.step('AND is resized', async (): Promise<void> => resizeStall.resize(WIDTH, HEIGHT));

    await test.step('THEN one F-U8-8 note names the pointer move and where it left the pointer', (): void =>
      resizeStall.expectNotes([POINTER_MOVE_NOTE]));

    await test.step('AND one F-U8-8 line warned for the CI log names the pointer move', (): void =>
      resizeStall.expectWarnings([POINTER_MOVE_WARNING]));
  });

  test('GIVEN a stalled resize event and a nudge that throws, the wait records the throw and tries the next nudge', async ({
    pageClock,
    resizeStall
  }): Promise<void> => {
    await test.step('WHEN the page has a paused fake clock', async (): Promise<void> => pageClock.install());

    await test.step('AND gets no real resize event', async (): Promise<void> => resizeStall.swallowResizeEvents());

    await test.step('AND gets one on a pointer move', async (): Promise<void> => resizeStall.resizeOnPointerMove());

    await test.step('AND throws on a forced layout', async (): Promise<void> => resizeStall.throwOnLayout());

    await test.step('AND is open', async (): Promise<void> => resizeStall.open());

    await test.step('AND is resized', async (): Promise<void> => resizeStall.resize(WIDTH, HEIGHT));

    await test.step('THEN the F-U8-8 note names the throw and the pointer move', (): void =>
      resizeStall.expectNotes([THROWN_NUDGE_NOTE]));
  });

  test('GIVEN a resize event that never arrives, the resize fails before the test timeout', async ({
    pageClock,
    resizeStall
  }): Promise<void> => {
    test.setTimeout(BOUNDED_TIMEOUT_MS);

    await test.step('WHEN the page has a paused fake clock', async (): Promise<void> => pageClock.install());

    await test.step('AND gets no real resize event', async (): Promise<void> => resizeStall.swallowResizeEvents());

    await test.step('AND is open', async (): Promise<void> => resizeStall.open());

    await test.step('THEN its resize fails naming the wait', async (): Promise<void> =>
      resizeStall.expectResizeToFail(WIDTH, HEIGHT, NO_EVENT_ERROR));
  });

  test('GIVEN a page that stops answering after the resize, the resize fails before the test timeout', async ({
    pageClock,
    resizeStall
  }): Promise<void> => {
    test.setTimeout(BOUNDED_TIMEOUT_MS);

    await test.step('WHEN the page has a paused fake clock', async (): Promise<void> => pageClock.install());

    await test.step('AND spins forever on its resize event', async (): Promise<void> => resizeStall.wedgeOnResize());

    await test.step('AND is open', async (): Promise<void> => resizeStall.open());

    await test.step('THEN its resize fails naming the unanswered evaluate', async (): Promise<void> =>
      resizeStall.expectResizeToFail(WIDTH, HEIGHT, UNANSWERED_ERROR));
  });
});
