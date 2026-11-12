import { test } from './shell-stall.fixture.ts';

const RETRIED_NOTE =
  /^shell navigation retried and loaded; first try failed with "page\.goto: Timeout 3000ms exceeded\.": index\.html requests issued 1, finished 0, none failed$/u;

const STUCK_TWICE_ERROR =
  /^C84: shell navigation stuck twice; first try failed with .*index\.html requests issued 1, finished 0, .*; retry failed with .*index\.html requests issued 1, finished 0, /u;

test.describe('FEATURE: opening the shell retries a stuck navigation once and says what Chromium did (C84)', () => {
  test('GIVEN the shell answers, the open loads at once and notes nothing', async ({ shellStall }): Promise<void> => {
    await test.step('WHEN the shell is opened', async (): Promise<void> => shellStall.open());

    await test.step('THEN the shell is loaded', async (): Promise<void> => shellStall.expectShellLoaded());

    await test.step('AND no C84 note is recorded', (): void => shellStall.expectNotes([]));
  });

  test('GIVEN a first index.html request that never answers, the retry loads the shell and notes the stuck try', async ({
    shellStall
  }): Promise<void> => {
    await test.step('WHEN the first index.html request is held forever', (): void => shellStall.holdShell(1));

    await test.step('AND the shell is opened', async (): Promise<void> => shellStall.open());

    await test.step('THEN the shell is loaded', async (): Promise<void> => shellStall.expectShellLoaded());

    await test.step('AND one C84 note says the request was issued and never finished', (): void =>
      shellStall.expectNotes([RETRIED_NOTE]));
  });

  test('GIVEN both index.html requests never answer, the open throws C84 with both tries', async ({ shellStall }): Promise<void> => {
    await test.step('WHEN both index.html requests are held forever', (): void => shellStall.holdShell(2));

    await test.step('THEN the open fails naming both stuck tries', async (): Promise<void> =>
      shellStall.expectOpenToFail(STUCK_TWICE_ERROR));
  });
});
