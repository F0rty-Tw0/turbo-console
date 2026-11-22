import type { Mocked } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { moduleScreenOf } from './graph-module-screen.ts';
import type { ModuleCounts, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { MODULE_SLOW_TEXT } from '../common/graph-module.const.ts';
import type { ModuleCanvas } from '../common/module-canvas.type.ts';
import type { ModuleScreen, ModuleScreenLayout } from '../common/module-mode.type.ts';
import type { ModuleFileLeaf, ModuleLeaf, ModuleScene, ModuleShown } from '../common/module-scene.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { moduleCanvasMock } from '../test/mocks/module-canvas.mock.ts';
import { pageMock } from '../test/mocks/page.mock.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';

const COUNTS: ModuleCounts = { unresolved: 4, external: 3, assets: 2, self: 1 };

const FOUND: ModulesFound = { ...MODULES_FOUND_STUB, counts: COUNTS };

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const TYPES_OFF: ModuleShown = { types: false, tests: true, lazies: true };

const WEB_TYPES_OFF: ModulesViewState = { ...FRESH_WEB, shown: TYPES_OFF };

const fileLeafOf = (_: unknown, index: number): ModuleLeaf => {
  const leaf: ModuleFileLeaf = { kind: 'file', id: `file:f${index}.ts`, path: `f${index}.ts`, label: `f${index}.ts`, parent: 'dir:' };

  return leaf;
};

const LEAVES_301: ModuleLeaf[] = Array.from({ length: 301 }, fileLeafOf);

const FILE_IDS_301 = LEAVES_301.map((leaf) => leaf.id);

const SCENE_OF_301: ModuleScene = { boxes: [], leaves: LEAVES_301, links: [], leafCount: 301, fileIds: FILE_IDS_301 };

describe('FEATURE: moduleScreenOf', () => {
  let page: PageElements;
  let canvas: Mocked<ModuleCanvas>;
  let layout: Mocked<ModuleScreenLayout>;
  let screen: ModuleScreen;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    page = pageMock();
    canvas = moduleCanvasMock();
    layout = { draw: vi.fn(async (): Promise<void> => Promise.resolve()), scene: vi.fn(() => SCENE_OF_301), clear: vi.fn() };
    screen = moduleScreenOf({ page, layout, canvas, showGraph: vi.fn() });
    screen.enter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the screen entered on web', () => {
    it('WHEN it is scanning THEN the bar reads Modules of web and Scanning web…, with Refresh shown and no banner', () => {
      screen.scanning('web', FRESH_WEB);

      expect([
        page.modules.title.textContent,
        page.modules.status.textContent,
        page.modules.refresh.hidden,
        page.modules.banner.hidden
      ]).toStrictEqual(['Modules of web', 'Scanning web…', false, true]);
    });

    it('WHEN a fresh view is scanning THEN the View boxes read it, Test files unchecked', () => {
      screen.scanning('web', FRESH_WEB);

      expect([page.modules.types.checked, page.modules.tests.checked, page.modules.lazies.checked]).toStrictEqual([true, false, true]);
    });

    it('WHEN it fails THEN the banner reads Could not scan web. with Retry shown', () => {
      screen.failed('web');

      expect([page.modules.bannerText.textContent, page.modules.banner.hidden, page.modules.retry.hidden]).toStrictEqual([
        'Could not scan web.',
        false,
        false
      ]);
    });

    it('WHEN web is shown with Type-only imports off THEN the status, tooltip and checkboxes follow', async () => {
      screen.shown('web', FOUND, WEB_TYPES_OFF, { kind: 'first' });
      await vi.waitFor(() => expect(layout.draw).toHaveBeenCalledOnce());

      expect([
        page.modules.status.textContent,
        page.modules.status.title,
        page.modules.types.checked,
        page.modules.retry.hidden
      ]).toStrictEqual(['6 files · 9 imports · 4 unresolved', '3 external · 2 assets · 1 self', false, true]);
    });

    it('WHEN 301 leaves are drawn THEN the slow notice shows MODULE_SLOW_TEXT', async () => {
      screen.shown('web', FOUND, FRESH_WEB, { kind: 'first' });
      await vi.waitFor(() => expect(page.modules.slow.hidden).toBe(false));

      expect(page.modules.slow.textContent).toBe(MODULE_SLOW_TEXT);
    });
  });

  describe('GIVEN web scanning with no graph drawn', () => {
    it('WHEN it fails THEN the bar no longer reads Scanning web…', () => {
      layout.scene.mockReturnValue(null);
      screen.scanning('web', FRESH_WEB);
      screen.failed('web');

      expect([page.modules.status.textContent, page.modules.status.title]).toStrictEqual(['', '']);
    });
  });

  describe('GIVEN web shown with 301 leaves, then failed on Refresh', () => {
    it('WHEN it is scanning again THEN the banner, Retry and slow notice hide and the canvas is cleared', async () => {
      screen.shown('web', FOUND, FRESH_WEB, { kind: 'first' });
      await vi.waitFor(() => expect(page.modules.slow.hidden).toBe(false));
      screen.failed('web');
      screen.scanning('web', FRESH_WEB);

      expect([
        page.modules.banner.hidden,
        page.modules.retry.hidden,
        page.modules.slow.hidden,
        layout.clear.mock.calls.length
      ]).toStrictEqual([true, true, true, 1]);
    });
  });
});
