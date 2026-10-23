import { describe, expect, it, vi } from 'vitest';

import { exportImage } from './graph-toolbar-actions.ts';
import type { ExportActions } from '../common/toolbar-actions.type.ts';

const BACKGROUND = '#1f1f1f';

const background = (): string => BACKGROUND;

const throwingExport = (): string => {
  throw new Error('canvas too large');
};

describe('FEATURE: exportImage', () => {
  describe('GIVEN a view whose exportPng returns a string', () => {
    it('WHEN exportPng returns a string THEN exactly one exportImage is posted with it, built from the background', () => {
      const exportPng = vi.fn<(bg: string) => string>().mockReturnValue('AAAA');
      const post = vi.fn<ExportActions['post']>();
      const showError = vi.fn<(text: string) => void>();
      const view = { exportPng };
      const actions: ExportActions = { view, background, post, showError };

      exportImage(actions);

      expect(exportPng).toHaveBeenCalledExactlyOnceWith(BACKGROUND);
      expect(post).toHaveBeenCalledExactlyOnceWith({ type: 'exportImage', png: 'AAAA' });
      expect(showError).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a view whose exportPng throws', () => {
    it('WHEN exportPng throws THEN nothing is posted and the status shows "Could not export the image"', () => {
      const post = vi.fn<ExportActions['post']>();
      const showError = vi.fn<(text: string) => void>();
      const view = { exportPng: throwingExport };
      const actions: ExportActions = { view, background, post, showError };

      exportImage(actions);

      expect(post).not.toHaveBeenCalled();
      expect(showError).toHaveBeenCalledExactlyOnceWith('Could not export the image');
    });
  });
});
