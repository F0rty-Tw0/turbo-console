import { describe, expect, it, vi } from 'vitest';

import { exportImage } from './graph-toolbar-actions.ts';
import type { ExportActions } from '../common/toolbar-actions.type.ts';

const BACKGROUND = '#1f1f1f';

const FAILED = 'Could not export the image';

const background = (): string => BACKGROUND;

const throwingExport = (): string => {
  throw new Error('canvas too large');
};

describe('FEATURE: exportImage', () => {
  describe('GIVEN a view whose exportPng returns a string', () => {
    it('WHEN pressed THEN exactly one exportImage is posted with it, built from the background, and the status stays empty', () => {
      const exportPng = vi.fn<(bg: string) => string>().mockReturnValue('AAAA');
      const post = vi.fn<ExportActions['post']>();
      const status = { textContent: '' };
      const view = { exportPng };
      const actions: ExportActions = { view, background, post, status };

      exportImage(actions);

      expect(exportPng).toHaveBeenCalledExactlyOnceWith(BACKGROUND);
      expect(post).toHaveBeenCalledExactlyOnceWith({ type: 'exportImage', png: 'AAAA' });
      expect(status.textContent).toBe('');
    });

    it('WHEN pressed after a failed export THEN the failure text is cleared', () => {
      const status = { textContent: FAILED };
      const view = { exportPng: background };
      const actions: ExportActions = { view, background, post: vi.fn(), status };

      exportImage(actions);

      expect(status.textContent).toBe('');
    });

    it('WHEN pressed while the status shows other text THEN that text stays', () => {
      const status = { textContent: 'web selected' };
      const view = { exportPng: background };
      const actions: ExportActions = { view, background, post: vi.fn(), status };

      exportImage(actions);

      expect(status.textContent).toBe('web selected');
    });
  });

  describe('GIVEN a view whose exportPng throws', () => {
    it('WHEN pressed THEN nothing is posted and the status shows "Could not export the image"', () => {
      const post = vi.fn<ExportActions['post']>();
      const status = { textContent: '' };
      const view = { exportPng: throwingExport };
      const actions: ExportActions = { view, background, post, status };

      exportImage(actions);

      expect(post).not.toHaveBeenCalled();
      expect(status.textContent).toBe(FAILED);
    });
  });
});
