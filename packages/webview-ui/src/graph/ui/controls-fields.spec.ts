import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { depthInput, hintedField } from './controls-fields.ts';
import { DEPTH_HINT, DEPTH_HINT_ID, DEPTH_LABEL } from '../common/graph.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const titleOf = (element: Element): string => String(Reflect.get(element, 'title'));

const childOf = (parent: Element, index: number): Element => {
  const child = parent.children[index];

  if (child === undefined) throw new Error(`no child ${index}`);

  return child;
};

describe('FEATURE: hinted controls field', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a hinted depth field', () => {
    it('WHEN built THEN the input is described by the hint and keeps its caption as name', () => {
      const input = depthInput();
      const group = hintedField(DEPTH_LABEL, input, DEPTH_HINT, DEPTH_HINT_ID);
      const label = childOf(group, 0);
      const hint = childOf(group, 1);
      const caption = childOf(label, 0);

      expect([input.getAttribute('aria-describedby'), hint.id, hint.textContent, titleOf(label), caption.textContent]).toStrictEqual([
        DEPTH_HINT_ID,
        DEPTH_HINT_ID,
        DEPTH_HINT,
        DEPTH_HINT,
        DEPTH_LABEL
      ]);
    });

    it('WHEN built THEN the hint sits beside the label, not inside it', () => {
      const group = hintedField(DEPTH_LABEL, depthInput(), DEPTH_HINT, DEPTH_HINT_ID);
      const label = childOf(group, 0);
      const hint = childOf(group, 1);

      expect([group.className, hint.className, label.children.length]).toStrictEqual(['controls-field-group', 'controls-hint', 2]);
    });
  });
});
