import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trackPointerFocus } from './pointer-focus.ts';
import { POINTER_FOCUS_CLASS } from '../common/graph.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

describe('FEATURE: trackPointerFocus', () => {
  let body: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());

    body = document.createElement('div');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a body tracked on a document', () => {
    let doc: EventTarget;

    beforeEach(() => {
      doc = new EventTarget();
      trackPointerFocus(body, doc);
    });

    it('WHEN a pointer is pressed THEN the body is marked', () => {
      doc.dispatchEvent(new Event('pointerdown'));

      expect(body.className).toBe(POINTER_FOCUS_CLASS);
    });

    it('WHEN a pointer is pressed then a key THEN the mark is gone', () => {
      doc.dispatchEvent(new Event('pointerdown'));
      doc.dispatchEvent(new Event('keydown'));

      expect(body.className).toBe('');
    });

    it('WHEN only a key is pressed THEN the body stays unmarked', () => {
      doc.dispatchEvent(new Event('keydown'));

      expect(body.className).toBe('');
    });
  });

  describe('GIVEN a body tracked with no document passed', () => {
    let doc: EventTarget;

    beforeEach(() => {
      doc = new EventTarget();
      vi.stubGlobal('document', doc);
      trackPointerFocus(body);
    });

    it('WHEN a pointer is pressed on the global document THEN the body is marked', () => {
      doc.dispatchEvent(new Event('pointerdown'));

      expect(body.className).toBe(POINTER_FOCUS_CLASS);
    });
  });
});
