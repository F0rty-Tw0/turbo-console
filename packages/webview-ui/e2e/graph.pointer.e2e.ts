import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';

const U1_7 = { description: 'U1 phase 2, U1-7', type: 'requirement' };

test.describe('FEATURE: graph pointer', () => {
  test(
    'GIVEN the details graph, the cursor is a pointer over a node and a link and default over empty canvas',
    { annotation: U1_7 },
    async ({ graphHost, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the canvas is quiet', async (): Promise<void> => graphPointer.waitForQuietCanvas());

      await test.step('AND the pointer rests on web', async (): Promise<void> => graphPointer.overNode('web'));

      await test.step('THEN the cursor there is a pointer', async (): Promise<void> => graphPointer.expectCursor('pointer'));

      await test.step('WHEN the canvas settles', async (): Promise<void> => graphPointer.settle());

      await test.step('THEN it drew no frame after the hover', (): void => graphPointer.expectNoLateRender());

      await test.step('WHEN the pointer moves onto the web to ui link', async (): Promise<void> => graphPointer.overLink('web', 'ui'));

      await test.step('THEN the cursor there is a pointer', async (): Promise<void> => graphPointer.expectCursor('pointer'));

      await test.step('WHEN the canvas settles', async (): Promise<void> => graphPointer.settle());

      await test.step('THEN it drew no frame after the hover', (): void => graphPointer.expectNoLateRender());

      await test.step('WHEN the pointer moves to empty canvas', async (): Promise<void> => graphPointer.overBackground());

      await test.step('THEN the cursor there is the default', async (): Promise<void> => graphPointer.expectCursor('default'));

      await test.step('WHEN the pointer moves back onto web', async (): Promise<void> => graphPointer.overNode('web'));

      await test.step('AND the pointer leaves the canvas', async (): Promise<void> => graphPointer.leaveCanvas());

      await test.step('THEN the container cursor is the default', async (): Promise<void> =>
        graphPointer.expectContainerCursor('default'));
    }
  );

  test(
    'GIVEN the details graph, a mouse press on a node, a link or empty canvas draws nothing around the pointer',
    { annotation: U1_7 },
    async ({ graphHost, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the pointer rests on web', async (): Promise<void> => graphPointer.overNode('web'));

      await test.step('AND the mouse is pressed there', async (): Promise<void> => graphPointer.press());

      await test.step('THEN no pixel around web changed', (): void => graphPointer.expectPressDrewNothing());

      await test.step('AND the canvas drew no frame after the press', (): void => graphPointer.expectNoLateRender());

      await test.step('WHEN the pointer moves onto the web to ui link', async (): Promise<void> => graphPointer.overLink('web', 'ui'));

      await test.step('AND the mouse is pressed there', async (): Promise<void> => graphPointer.press());

      await test.step('THEN no pixel around the link changed', (): void => graphPointer.expectPressDrewNothing());

      await test.step('AND the canvas drew no frame after the press', (): void => graphPointer.expectNoLateRender());

      await test.step('WHEN the pointer moves to empty canvas', async (): Promise<void> => graphPointer.overBackground());

      await test.step('AND the mouse is pressed there', async (): Promise<void> => graphPointer.press());

      await test.step('THEN no pixel around the pointer changed', (): void => graphPointer.expectPressDrewNothing());

      await test.step('AND the canvas drew no frame after the press', (): void => graphPointer.expectNoLateRender());
    }
  );
});
