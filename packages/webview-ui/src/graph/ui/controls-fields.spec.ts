import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { affectedField, checkbox, depthInput, hintedField, predictionField, scriptsField } from './controls-fields.ts';
import { SHOW_AFFECTED_LABEL, SHOW_PREDICTION_LABEL, SHOW_SCRIPTS_LABEL } from '../common/graph-task.const.ts';
import { DEPTH_HINT, DEPTH_HINT_ID, DEPTH_LABEL } from '../common/graph.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { childAt } from '../test/utils/html-child.spec.util.ts';

describe('FEATURE: controls fields', () => {
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
      const label = childAt(group, 0);
      const hint = childAt(group, 1);
      const caption = childAt(label, 0);

      expect([input.getAttribute('aria-describedby'), hint.id, hint.textContent, label.title, caption.textContent]).toStrictEqual([
        DEPTH_HINT_ID,
        DEPTH_HINT_ID,
        DEPTH_HINT,
        DEPTH_HINT,
        DEPTH_LABEL
      ]);
    });

    it('WHEN built THEN the hint sits beside the label, not inside it', () => {
      const group = hintedField(DEPTH_LABEL, depthInput(), DEPTH_HINT, DEPTH_HINT_ID);
      const label = childAt(group, 0);
      const hint = childAt(group, 1);

      expect([group.className, hint.className, label.children.length]).toStrictEqual(['controls-field-group', 'controls-hint', 2]);
    });
  });

  describe('GIVEN a Show scripts checkbox', () => {
    it('WHEN its field is built THEN it is a label reading Show scripts with the input first', () => {
      const input = checkbox('controls-check');
      const label = scriptsField(input);

      expect([label.tagName, label.textContent, label.children[0]]).toStrictEqual(['LABEL', SHOW_SCRIPTS_LABEL, input]);
    });
  });

  describe('GIVEN a Show cache prediction checkbox', () => {
    it('WHEN its field is built THEN it is a label reading Show cache prediction with the input first', () => {
      const input = checkbox('controls-check');
      const label = predictionField(input);

      expect([label.tagName, label.textContent, label.children[0]]).toStrictEqual(['LABEL', SHOW_PREDICTION_LABEL, input]);
    });
  });

  describe('GIVEN a Show affected checkbox', () => {
    it('WHEN its field is built THEN it is a label reading Show affected with the input first', () => {
      const input = checkbox('controls-check');
      const label = affectedField(input);

      expect([label.tagName, label.textContent, label.children[0]]).toStrictEqual(['LABEL', SHOW_AFFECTED_LABEL, input]);
    });
  });
});
