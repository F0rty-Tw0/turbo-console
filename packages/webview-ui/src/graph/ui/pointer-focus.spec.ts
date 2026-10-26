import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trackPointerFocus } from './pointer-focus.ts';
import { POINTER_FOCUS_CLASS } from '../common/graph.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

describe('FEATURE: trackPointerFocus', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());

    container = document.createElement('div');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a container tracked on a document', () => {
    let doc: EventTarget;

    beforeEach(() => {
      doc = new EventTarget();
      trackPointerFocus(container, doc);
    });

    it('WHEN a pointer is pressed THEN the container is marked', () => {
      doc.dispatchEvent(new Event('pointerdown'));

      expect(container.className).toBe(POINTER_FOCUS_CLASS);
    });

    it('WHEN a pointer is pressed then a key THEN the mark is gone', () => {
      doc.dispatchEvent(new Event('pointerdown'));
      doc.dispatchEvent(new Event('keydown'));

      expect(container.className).toBe('');
    });

    it('WHEN only a key is pressed THEN the container stays unmarked', () => {
      doc.dispatchEvent(new Event('keydown'));

      expect(container.className).toBe('');
    });
  });

  describe('GIVEN a container tracked with no document passed', () => {
    let doc: EventTarget;

    beforeEach(() => {
      doc = new EventTarget();
      vi.stubGlobal('document', doc);
      trackPointerFocus(container);
    });

    it('WHEN a pointer is pressed on the global document THEN the container is marked', () => {
      doc.dispatchEvent(new Event('pointerdown'));

      expect(container.className).toBe(POINTER_FOCUS_CLASS);
    });
  });
});
