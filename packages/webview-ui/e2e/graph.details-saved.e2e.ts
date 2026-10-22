import { test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { SAVED_BASE_STUB } from './test/stubs/graph-saved.stub.ts';
import { linkInspection, packageInspection, traceInspection } from './test/utils/graph-inspection.spec.util.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const C5 = { description: 'M4-3 C5', type: 'requirement' };

const WEB_TO_UI = { source: 'web', target: 'ui' };

const WEB_TO_CORE = { start: 'web', end: 'core' };

const PAN = { x: 30, y: 40 };

const SAVED_CAMERA = { zoom: 2, pan: PAN };

const UI_TO_WEB = { source: 'ui', target: 'web' };

const WEB_TO_SOLO = { start: 'web', end: 'solo' };

const BAD_TRACE = { start: 1, end: 'x' };

const MALFORMED_SAVED = { ...SAVED_BASE_STUB, ...SAVED_CAMERA, detailsOpen: 'no', link: 5, trace: BAD_TRACE };

test.describe('FEATURE: graph details restore order', () => {
  test(
    'GIVEN a saved trace whose end is hidden, the page restores the selected package instead',
    { annotation: C5 },
    async ({ graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      const saved = { ...SAVED_BASE_STUB, selected: 'web', trace: WEB_TO_CORE, hidden: ['core'] };

      await test.step('WHEN the page is opened with that saved state', async (): Promise<void> =>
        graphPage.open({ savedState: saved }));

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN web is inspected as a package', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the core row is unticked', async (): Promise<void> => graphList.expectRowChecked('core', false));
    }
  );

  test(
    'GIVEN a saved link whose target is hidden, the page restores nothing and shows the empty panel',
    { annotation: C5 },
    async ({ graphDetails, graphHost, graphPage }): Promise<void> => {
      const saved = { ...SAVED_BASE_STUB, link: WEB_TO_UI, hidden: ['ui'] };

      await test.step('WHEN the page is opened with that saved state', async (): Promise<void> =>
        graphPage.open({ savedState: saved }));

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('AND the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());
    }
  );

  test(
    'GIVEN a saved link that no edge draws, the page restores nothing and asks the host nothing',
    { annotation: C5 },
    async ({ graphDetails, graphHost, graphPage, graphReplies }): Promise<void> => {
      const saved = { ...SAVED_BASE_STUB, link: UI_TO_WEB };

      await test.step('WHEN the page is opened with that saved state', async (): Promise<void> =>
        graphPage.open({ savedState: saved }));

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('AND the host was asked to explain nothing', async (): Promise<void> => graphReplies.expectNoExplainAsked());
    }
  );

  test(
    'GIVEN a saved selection, link and a trace with a hidden end, the link wins and the trace is dropped',
    { annotation: C5 },
    async ({ graphDetails, graphHost, graphPage, graphReplies }): Promise<void> => {
      const saved = { ...SAVED_BASE_STUB, selected: 'core', link: WEB_TO_UI, trace: WEB_TO_SOLO, hidden: ['solo'] };

      await test.step('WHEN the page is opened with that saved state', async (): Promise<void> =>
        graphPage.open({ savedState: saved }));

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the web to ui link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'ui')));

      await test.step('AND the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'ui', 1));
    }
  );

  test(
    'GIVEN a saved selection, link and trace that all fit, only the trace is restored',
    { annotation: C5 },
    async ({ graphDetails, graphHost, graphPage, graphReplies }): Promise<void> => {
      const saved = { ...SAVED_BASE_STUB, selected: 'ui', link: WEB_TO_UI, trace: WEB_TO_CORE };

      await test.step('WHEN the page is opened with that saved state', async (): Promise<void> =>
        graphPage.open({ savedState: saved }));

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the web to core trace is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));

      await test.step('AND the host was asked to explain nothing', async (): Promise<void> => graphReplies.expectNoExplainAsked());
    }
  );

  test(
    'GIVEN malformed details fields beside a good camera, the camera is restored and the panel starts open and empty',
    { annotation: C5 },
    async ({ graphDetails, graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened with that saved state', async (): Promise<void> =>
        graphPage.open({ savedState: MALFORMED_SAVED }));

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the camera is the saved one', async (): Promise<void> =>
        graphLook.expectView({ ...SAVED_BASE_STUB, ...SAVED_CAMERA }));

      await test.step('AND the panel is open', async (): Promise<void> => graphDetails.expectOpen(true));

      await test.step('AND nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );
});
