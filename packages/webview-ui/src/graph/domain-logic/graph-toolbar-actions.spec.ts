import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { exportImage } from './graph-toolbar-actions.ts';
import type { TaskPanel } from '../common/graph-task.type.ts';
import type { ExportActions } from '../common/toolbar-actions.type.ts';

type ExportRig = {
  readonly actions: ExportActions;
  readonly post: Mock<ExportActions['post']>;
  readonly showNotice: Mock<TaskPanel['notice']>;
};

const BACKGROUND = '#1f1f1f';

const FAILED = 'Could not export the image';

const background = (): string => BACKGROUND;

const throwingExport = (): string => {
  throw new Error('canvas too large');
};

/** One press's actions over `exportPng`, with the notice line reading `noticeText`. */
const rigOf = (exportPng: (bg: string) => string, noticeText: string): ExportRig => {
  const post = vi.fn<ExportActions['post']>();
  const notice = { textContent: noticeText };
  const showNotice = vi.fn<TaskPanel['notice']>();
  const view = { exportPng };
  const actions: ExportActions = { view, background, post, notice, showNotice };
  const rig: ExportRig = { actions, post, showNotice };

  return rig;
};

describe('FEATURE: exportImage', () => {
  describe('GIVEN a view whose exportPng returns a string', () => {
    it('WHEN pressed THEN exactly one exportImage is posted with it, built from the background', () => {
      const exportPng = vi.fn<(bg: string) => string>().mockReturnValue('AAAA');
      const rig = rigOf(exportPng, '');

      exportImage(rig.actions);

      expect(exportPng).toHaveBeenCalledExactlyOnceWith(BACKGROUND);
      expect(rig.post).toHaveBeenCalledExactlyOnceWith({ type: 'exportImage', png: 'AAAA' });
    });

    it('WHEN pressed after a failed export THEN the notice line hides', () => {
      const rig = rigOf(background, FAILED);

      exportImage(rig.actions);

      expect(rig.showNotice).toHaveBeenCalledExactlyOnceWith(null);
    });

    it('WHEN pressed while the notice line shows another notice THEN that notice stays', () => {
      const rig = rigOf(background, '2 tasks were not found');

      exportImage(rig.actions);

      expect(rig.showNotice).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a view whose exportPng throws', () => {
    it('WHEN pressed THEN nothing is posted', () => {
      const rig = rigOf(throwingExport, '');

      exportImage(rig.actions);

      expect(rig.post).not.toHaveBeenCalled();
    });

    it('WHEN pressed THEN the notice line shows "Could not export the image"', () => {
      const rig = rigOf(throwingExport, '');

      exportImage(rig.actions);

      expect(rig.showNotice).toHaveBeenCalledExactlyOnceWith(FAILED);
    });
  });
});
