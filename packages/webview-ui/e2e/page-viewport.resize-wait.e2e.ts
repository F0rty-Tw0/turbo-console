import { test } from './resize-stall.fixture.ts';

const WIDTH = 400;
const HEIGHT = 300;

/** A wait that never ends runs to the test timeout; one that gives up fails well before it. */
const BOUNDED_TIMEOUT_MS = 15_000;

test.describe('FEATURE: a resize waits for the page’s resize event, bounded and self-diagnosing (F-U8-8)', () => {
  test('GIVEN the resize event arrives, the resize returns and notes nothing', async ({ pageClock, resizeStall }): Promise<void> => {
    await test.step('WHEN the page has a paused fake clock', async (): Promise<void> => pageClock.install());

    await test.step('AND is open', async (): Promise<void> => resizeStall.open());

    await test.step('AND is resized', async (): Promise<void> => resizeStall.resize(WIDTH, HEIGHT));

    await test.step('THEN no F-U8-8 note is recorded', (): void => resizeStall.expectNotes([]));
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

    await test.step('THEN one F-U8-8 note names the pointer move', (): void =>
      resizeStall.expectNotes([/^released by mouse\.move: resize wanted \{"width":400,"height":300\} after \d+ ms, page \{/u]));
  });

  test('GIVEN a resize event that never arrives, the resize fails before the test timeout', async ({
    pageClock,
    resizeStall
  }): Promise<void> => {
    test.setTimeout(BOUNDED_TIMEOUT_MS);

    await test.step('WHEN the page has a paused fake clock', async (): Promise<void> => pageClock.install());

    await test.step('AND gets no real resize event', async (): Promise<void> => resizeStall.swallowResizeEvents());

    await test.step('AND is open', async (): Promise<void> => resizeStall.open());

    await test.step('THEN its resize fails naming the wait', async (): Promise<void> => resizeStall.expectResizeToFail(WIDTH, HEIGHT));
  });
});
