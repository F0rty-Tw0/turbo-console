import { test } from './graph-viewport.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';

const PACKAGES = ['app', 'lib', 'ui'];

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

/*
 * Headless Chromium hides scrollbars, so a layer that overflows the graph body for one frame never shows one; VS Code's
 * webview does, and the scrollbar it adds shrinks the body again inside the same ResizeObserver pass. Launch options
 * force a new worker, so this lives in its own file.
 */
const SCROLLBARS_SHOWN = { ignoreDefaultArgs: ['--hide-scrollbars'] };

test.use({ launchOptions: SCROLLBARS_SHOWN });

test.describe('FEATURE: graph layers kept inside the graph body', () => {
  test('GIVEN the package graph with its Details aside and scrollbars shown, a smaller viewport raises no ResizeObserver loop error', async ({
    graphHost,
    graphPage,
    graphProbe,
    pageViewport
  }): Promise<void> => {
    await test.step('GIVEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

    await test.step('AND its packages are drawn', async (): Promise<void> => graphProbe.expectNodeIds(stateNamesOf(DETAILS_STUB)));

    await test.step('WHEN the viewport shrinks to 900 by 600', async (): Promise<void> => pageViewport.resize(900, 600));

    await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

    await test.step('THEN the page raised no errors', (): void => graphPage.expectNoErrors());
  });

  test('GIVEN task mode on the app#build chain and scrollbars shown, a smaller viewport raises no ResizeObserver loop error', async ({
    graphHost,
    graphPage,
    graphProbe,
    graphTask,
    graphTaskHost,
    graphTaskProbe,
    pageViewport
  }): Promise<void> => {
    await test.step('GIVEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the task stub is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

    await test.step('AND its packages are drawn', async (): Promise<void> => graphProbe.expectNodeIds(PACKAGES));

    await test.step('AND task mode is entered', async (): Promise<void> => graphTask.enter());

    await test.step('AND the app#build chain is shown', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#build']));

    await test.step('AND its tasks are drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

    await test.step('WHEN the viewport shrinks to 900 by 600', async (): Promise<void> => pageViewport.resize(900, 600));

    await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

    await test.step('THEN the page raised no errors', (): void => graphPage.expectNoErrors());
  });
});
