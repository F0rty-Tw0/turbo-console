import { test } from './shell.fixture.ts';

const AC7 = { description: 'AC7', type: 'requirement' };

test.describe('FEATURE: graph shell', () => {
  test('GIVEN the webview CSP, the shell renders ready with no violation or error', async ({ shellPage }): Promise<void> => {
    await test.step('WHEN the shell is opened', async (): Promise<void> => shellPage.goto());

    await test.step('THEN the ready marker is visible', async (): Promise<void> => shellPage.expectReady());

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => shellPage.expectNoViolations());

    await test.step('AND no console or page error is logged', (): void => shellPage.expectNoErrors());
  });

  test('GIVEN a VS Code host, the shell posts ready to it under the webview CSP', async ({ shellPage }): Promise<void> => {
    await test.step('WHEN the shell is opened inside the host', async (): Promise<void> => shellPage.goto({ host: true }));

    await test.step('THEN the ready marker is visible', async (): Promise<void> => shellPage.expectReady());

    await test.step('AND the host received exactly one ready message', async (): Promise<void> => shellPage.expectReadyPosted());

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => shellPage.expectNoViolations());
  });

  test('GIVEN an inline script without the nonce, the CSP blocks it', { annotation: AC7 }, async ({ shellPage }): Promise<void> => {
    await test.step('WHEN the shell is opened', async (): Promise<void> => shellPage.goto({ inlineScript: true }));

    await test.step('THEN a CSP violation is recorded', async (): Promise<void> => shellPage.expectViolation());

    await test.step('AND the inline script did not run', async (): Promise<void> => shellPage.expectInlineScriptBlocked());
  });

  test('GIVEN the webview CSP, an HTML string written to a DOM sink is refused by Trusted Types', async ({
    shellPage
  }): Promise<void> => {
    await test.step('WHEN the shell is opened', async (): Promise<void> => shellPage.goto());

    await test.step('THEN writing a string to innerHTML throws a TypeError', async (): Promise<void> =>
      shellPage.expectStringSinkRefused());
  });
});
