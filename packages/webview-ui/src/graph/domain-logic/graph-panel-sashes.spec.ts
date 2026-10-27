import { afterEach, describe, expect, it, vi } from 'vitest';

import { wirePanelSashes } from './graph-panel-sashes.ts';
import type { PanelWidths } from '../../bridge/common/graph-view-state.type.ts';
import { TASK_MODE_CLASS } from '../common/graph-task.const.ts';
import type { PanelSashPageMock } from '../test/common/panel-sash-page.type.ts';
import { panelSashPageMock } from '../test/mocks/panel-sash-page.mock.ts';

const WIDE_SAVED: PanelWidths = { controls: 400, details: 400 };

const keyDown = (key: string): Event => Object.assign(new Event('keydown'), { key });

/** A 1000px docked body with 400 + 400 saved, wired, then Controls given `End`: it squeezes Details to 200 and takes 380. */
const squeezedPage = (): PanelSashPageMock => {
  const page = panelSashPageMock(1000, WIDE_SAVED);

  wirePanelSashes(page.deps);
  page.deps.sashes.controls.dispatchEvent(keyDown('End'));

  return page;
};

describe('FEATURE: GraphPanelSashes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN saved widths of 400 and 400 in a 1000px docked body', () => {
    it('WHEN the sashes are wired THEN the pair is drawn clamped, Controls giving way first', () => {
      const page = panelSashPageMock(1000, WIDE_SAVED);

      wirePanelSashes(page.deps);

      expect(page.written).toStrictEqual({ '--tc-controls-width': '200px', '--tc-details-width': '380px' });
    });

    it('WHEN Controls is given End THEN Details gives way and the squeezed pair is drawn', () => {
      const page = squeezedPage();

      expect(page.written).toStrictEqual({ '--tc-controls-width': '380px', '--tc-details-width': '200px' });
    });

    describe('WHEN a drag has squeezed Details', () => {
      it('THEN a body tick at the same width keeps the drawn pair', () => {
        const page = squeezedPage();

        page.resizeBody();

        expect(page.written).toStrictEqual({ '--tc-controls-width': '380px', '--tc-details-width': '200px' });
      });

      it('THEN a root class change keeps the drawn pair', () => {
        const page = squeezedPage();

        page.mutateRoot();

        expect(page.written).toStrictEqual({ '--tc-controls-width': '380px', '--tc-details-width': '200px' });
      });

      it('THEN a body tick at another width re-clamps Controls first', () => {
        const page = squeezedPage();

        page.setWidth(1100);
        page.resizeBody();

        expect(page.written).toStrictEqual({ '--tc-controls-width': '280px', '--tc-details-width': '400px' });
      });

      it('THEN the overlay flipping re-clamps with Details floating', () => {
        const page = squeezedPage();

        page.flipOverlay(true);

        expect(page.written).toStrictEqual({ '--tc-controls-width': '380px', '--tc-details-width': '400px' });
      });
    });

    describe('WHEN the root gets the task mode class', () => {
      it('THEN the sashes point at the task panels and the widths stay', () => {
        const page = squeezedPage();
        const { root, sashes } = page.deps;

        root.classList.add(TASK_MODE_CLASS);
        page.mutateRoot();

        expect(sashes.controls.getAttribute('aria-controls')).toBe('graph-task-controls');
        expect(sashes.details.getAttribute('aria-controls')).toBe('graph-task-details');
        expect(sashes.controls.getAttribute('aria-valuenow')).toBe('380');
      });
    });

    it('WHEN the body width changes THEN the tick reads it once', () => {
      const page = panelSashPageMock(1000, WIDE_SAVED);

      wirePanelSashes(page.deps);
      page.setWidth(1100);

      const before = page.widthReads();

      page.resizeBody();

      expect(page.widthReads() - before).toBe(1);
    });
  });

  describe('GIVEN no saved widths', () => {
    it('WHEN the sashes are wired THEN the defaults are drawn and nothing is saved', () => {
      const page = panelSashPageMock(1280, null);

      wirePanelSashes(page.deps);

      expect(page.written).toStrictEqual({ '--tc-controls-width': '260px', '--tc-details-width': '280px' });
      expect(page.saved).not.toHaveBeenCalled();
    });
  });
});
