import { test } from './shell.fixture.ts';

const AC7 = { description: 'AC7', type: 'requirement' };

test.describe('FEATURE: graph-ui shell', () => {
  test('GIVEN the webview CSP, the shell renders ready with no violation or error', async ({ shellPage }): Promise<void> => {
    await test.step('WHEN the shell is opened', async (): Promise<void> => shellPage.goto());

    await test.step('THEN the ready marker is visible', async (): Promise<void> => shellPage.expectReady());

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => shellPage.expectNoViolations());

    await test.step('AND no console or page error is logged', (): void => shellPage.expectNoErrors());
  });

  test('GIVEN an inline script without the nonce, the CSP blocks it', { annotation: AC7 }, async ({ shellPage }): Promise<void> => {
    await test.step('WHEN the shell is opened', async (): Promise<void> => shellPage.goto({ inlineScript: true }));

    await test.step('THEN a CSP violation is recorded', async (): Promise<void> => shellPage.expectViolation());

    await test.step('AND the inline script did not run', async (): Promise<void> => shellPage.expectInlineScriptBlocked());
  });
});
