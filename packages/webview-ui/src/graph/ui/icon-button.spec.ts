import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { iconButton, iconTextButton } from './icon-button.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const classAndTextOf = (element: Element): (string | null)[] => [element.className, element.textContent];

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

  describe('GIVEN an icon, a label and a title for a labelled button', () => {
    it('WHEN the button is built THEN it is a typed text-button with the title, its icon, then its label', () => {
      const button = iconTextButton('target', 'Focus', 'Focus the graph on web');
      const children = Array.from(button.children, classAndTextOf);

      expect([button.type, button.className, button.title, children]).toStrictEqual([
        'button',
        'text-button',
        'Focus the graph on web',
        [
          ['codicon codicon-target', ''],
          ['button-label', 'Focus']
        ]
      ]);
    });
  });
});
