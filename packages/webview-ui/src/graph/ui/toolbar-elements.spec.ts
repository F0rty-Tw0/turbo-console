import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildToolbar } from './toolbar-elements.ts';
import type { ToolbarElements } from '../common/graph-page.type.ts';
import { MODE_LABEL, TASK_MODE_LABEL } from '../common/graph-task.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

describe('FEATURE: buildToolbar', () => {
  let elements: ToolbarElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    elements = buildToolbar();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the toolbar in its pre-state', () => {
    it('WHEN its first part is read THEN it is the Mode group holding the Task mode toggle', () => {
      const first = elements.toolbar.children[0];

      expect(first?.getAttribute('aria-label')).toBe(MODE_LABEL);
      expect(first?.children[0]).toBe(elements.taskMode);
    });

    it('WHEN the Task mode toggle is read THEN it is unpressed, disabled and named Task mode', () => {
      const { taskMode } = elements;

      expect(taskMode.getAttribute('aria-pressed')).toBe('false');
      expect(taskMode.disabled).toBe(true);
      expect(taskMode.children[1]?.textContent).toBe(TASK_MODE_LABEL);
    });

    it('WHEN its second part is read THEN it is a separator', () => {
      const second = elements.toolbar.children[1];

      expect(second?.className).toBe('toolbar-separator');
      expect(second?.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
