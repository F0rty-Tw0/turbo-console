import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setButtonIcon, setButtonLabel, setButtonText, setFocusButton, setIconTextButton } from './button-title.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const FOCUS_CASES = [
  { title: 'focused', isFocused: true, icon: 'codicon codicon-close', text: 'Clear focus' },
  { title: 'unfocused', isFocused: false, icon: 'codicon codicon-target', text: 'Focus' }
];

/** A button drawn like a Details action: its icon, then its label. */
const iconTextButtonOf = (iconClass: string): HTMLButtonElement => {
  const button = document.createElement('button');
  const icon = document.createElement('span');
  const label = document.createElement('span');

  icon.className = iconClass;
  button.append(icon, label);

  return button;
};

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

    it.each(FOCUS_CASES)(
      'GIVEN $title WHEN setFocusButton runs THEN the icon and the text are $icon / $text',
      ({ isFocused, icon, text }) => {
        const button = iconTextButtonOf('codicon codicon-file-text');

        setFocusButton(button, isFocused);

        const [iconChild, labelChild] = Array.from(button.children);

        expect([iconChild?.className, labelChild?.textContent, button.title]).toStrictEqual([icon, text, text]);
      }
    );
  });

  describe('GIVEN a button with no children', () => {
    it('WHEN setButtonIcon runs THEN it adds nothing', () => {
      const button = document.createElement('button');

      setButtonIcon(button, 'close');

      expect(button.children).toHaveLength(0);
    });
  });
});
