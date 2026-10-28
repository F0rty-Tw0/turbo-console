import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setButtonIcon, setButtonLabel, setButtonText, setFocusButton, setIconTextButton } from './button-title.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { faceOf, iconTextButtonOf } from '../test/utils/button-face.spec.util.ts';

const FOCUS_CASES = [
  { title: 'focused', isFocused: true, icon: 'codicon codicon-close', text: 'Clear focus' },
  { title: 'unfocused', isFocused: false, icon: 'codicon codicon-target', text: 'Focus' }
];

describe('FEATURE: button titles', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a Focus button', () => {
    it('WHEN setButtonText sets Clear focus THEN the text and the title both read Clear focus', () => {
      const button = document.createElement('button');

      button.textContent = 'Focus';
      setButtonText(button, 'Clear focus');

      expect([button.textContent, button.title]).toStrictEqual(['Clear focus', 'Clear focus']);
    });
  });

  describe('GIVEN an Expand button', () => {
    it('WHEN setButtonLabel sets Expand apps THEN the aria-label and the title both read Expand apps', () => {
      const button = document.createElement('button');

      setButtonLabel(button, 'Expand apps');

      expect([button.getAttribute('aria-label'), button.title]).toStrictEqual(['Expand apps', 'Expand apps']);
    });
  });

  describe('GIVEN an icon and text button', () => {
    it('WHEN setIconTextButton sets close / Clear focus THEN the icon, the text and the title all follow', () => {
      const button = iconTextButtonOf('codicon codicon-target');
      const [icon, label] = Array.from(button.children);

      setIconTextButton(button, 'close', 'Clear focus');

      const children = Array.from(button.children);

      expect([icon?.className, label?.textContent, button.title, children]).toStrictEqual([
        'codicon codicon-close',
        'Clear focus',
        'Clear focus',
        [icon, label]
      ]);
    });
  });

  describe.each(FOCUS_CASES)('GIVEN a $title package Focus button', ({ isFocused, icon, text }) => {
    it(`WHEN setFocusButton runs THEN the icon and the text are ${icon} / ${text}`, () => {
      const button = iconTextButtonOf('codicon codicon-file-text');

      setFocusButton(button, isFocused);

      const face = faceOf(button);

      expect([...face, button.title]).toStrictEqual([icon, text, text]);
    });
  });

  describe('GIVEN a button with only an icon', () => {
    it('WHEN setIconTextButton runs THEN the icon and the title follow and no label is added', () => {
      const button = document.createElement('button');
      const icon = document.createElement('span');

      button.append(icon);
      setIconTextButton(button, 'close', 'Clear focus');

      const drawn = [icon.className, button.title, button.children.length];

      expect(drawn).toStrictEqual(['codicon codicon-close', 'Clear focus', 1]);
    });
  });

  describe('GIVEN a button with no children', () => {
    it('WHEN setButtonIcon runs THEN it adds nothing', () => {
      const button = document.createElement('button');

      setButtonIcon(button, 'close');

      expect(button.children).toHaveLength(0);
    });
  });
});
