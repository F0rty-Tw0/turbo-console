import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeDocumentMock } from './fake-document.mock.ts';

describe('FEATURE: fakeDocumentMock', () => {
  let button: HTMLElement;
  let number: HTMLElement;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    button = document.createElement('button');
    number = document.createElement('span');
    button.append(number);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a span inside a button', () => {
    it('WHEN the span is clicked THEN a click listener on the button gets the span as the target', () => {
      const listener = vi.fn();

      button.addEventListener('click', listener);
      number.click();

      expect(listener).toHaveBeenCalledWith({ type: 'click', target: number });
    });

    it('WHEN closest is asked for a button THEN it answers the button', () => {
      expect(number.closest('button')).toBe(button);
    });

    it('WHEN closest is asked for a class THEN it throws naming the selector', () => {
      const asked = (): Element | null => number.closest('.import-row');

      expect(asked).toThrow('".import-row"');
    });
  });
});
