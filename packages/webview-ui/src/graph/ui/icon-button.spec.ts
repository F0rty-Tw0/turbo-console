import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { iconButton } from './icon-button.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

describe('FEATURE: iconButton', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an icon, a label and a title', () => {
    it('WHEN the button is built THEN it is a typed icon-button named by aria-label with the title', () => {
      const button = iconButton('screen-full', 'Fit', 'Zoom to fit the whole graph');

      expect([button.type, button.className, button.getAttribute('aria-label'), button.title]).toStrictEqual([
        'button',
        'icon-button',
        'Fit',
        'Zoom to fit the whole graph'
      ]);
    });

    it('WHEN the button is built THEN it holds only the icon and no text', () => {
      const button = iconButton('screen-full', 'Fit', 'Zoom to fit the whole graph');

      expect(button.children).toHaveLength(1);
      expect(button.textContent).toBe('');
    });

    it('WHEN the button is built THEN it is not disabled', () => {
      const button = iconButton('screen-full', 'Fit', 'Zoom to fit the whole graph');

      expect(button.disabled).toBe(false);
    });
  });
});
