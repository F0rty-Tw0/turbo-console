import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setButtonLabel, setButtonText } from './button-title.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

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
});
