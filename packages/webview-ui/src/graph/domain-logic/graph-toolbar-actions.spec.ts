import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { exportImage } from './graph-toolbar-actions.ts';
import type { TaskPanel } from '../common/graph-task.type.ts';
import type { ExportActions } from '../common/toolbar-actions.type.ts';

type ExportRig = {
  readonly actions: ExportActions;
  readonly post: Mock<ExportActions['post']>;
  readonly status: Pick<HTMLElement, 'textContent'>;
  readonly showNotice: Mock<TaskPanel['notice']>;
};

const BACKGROUND = '#1f1f1f';

const FAILED = 'Could not export the image';

const background = (): string => BACKGROUND;

const throwingExport = (): string => {
  throw new Error('canvas too large');
};

/** One press's actions over `exportPng`, with the status line and the notice line reading the given texts. */
const rigOf = (exportPng: (bg: string) => string, statusText: string, noticeText: string): ExportRig => {
  const post = vi.fn<ExportActions['post']>();
  const status = { textContent: statusText };
  const notice = { textContent: noticeText };
  const showNotice = vi.fn<TaskPanel['notice']>();
  const view = { exportPng };
  const actions: ExportActions = { view, background, post, status, notice, showNotice };
  const rig: ExportRig = { actions, post, status, showNotice };

  return rig;
};

describe('FEATURE: exportImage', () => {
  describe('GIVEN a view whose exportPng returns a string', () => {
    it('WHEN pressed THEN exactly one exportImage is posted with it, built from the background, and the status stays empty', () => {
      const exportPng = vi.fn<(bg: string) => string>().mockReturnValue('AAAA');
      const rig = rigOf(exportPng, '', '');

      exportImage(rig.actions);

      expect(exportPng).toHaveBeenCalledExactlyOnceWith(BACKGROUND);
      expect(rig.post).toHaveBeenCalledExactlyOnceWith({ type: 'exportImage', png: 'AAAA' });
      expect(rig.status.textContent).toBe('');
    });

    it('WHEN pressed after a failed export THEN the failure text is cleared from the status line', () => {
      const rig = rigOf(background, FAILED, FAILED);

      exportImage(rig.actions);

      expect(rig.status.textContent).toBe('');
    });

    it('WHEN pressed after a failed export THEN the notice line hides', () => {
      const rig = rigOf(background, FAILED, FAILED);

      exportImage(rig.actions);

      expect(rig.showNotice).toHaveBeenCalledExactlyOnceWith(null);
    });

    it('WHEN pressed while the status shows other text THEN that text stays', () => {
      const rig = rigOf(background, 'web selected', '');

      exportImage(rig.actions);

      expect(rig.status.textContent).toBe('web selected');
    });

    it('WHEN pressed while the notice line shows another notice THEN that notice stays', () => {
      const rig = rigOf(background, '', '2 tasks were not found');

      exportImage(rig.actions);

      expect(rig.showNotice).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a view whose exportPng throws', () => {
    it('WHEN pressed THEN nothing is posted and the status shows "Could not export the image"', () => {
      const rig = rigOf(throwingExport, '', '');

      exportImage(rig.actions);

      expect(rig.post).not.toHaveBeenCalled();
      expect(rig.status.textContent).toBe(FAILED);
    });

    it('WHEN pressed THEN the notice line shows "Could not export the image"', () => {
      const rig = rigOf(throwingExport, '', '');

      exportImage(rig.actions);

      expect(rig.showNotice).toHaveBeenCalledExactlyOnceWith(FAILED);
    });
  });
});
