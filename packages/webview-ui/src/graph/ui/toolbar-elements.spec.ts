import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildToolbar } from './toolbar-elements.ts';
import type { ToolbarElements } from '../common/graph-page.type.ts';
import { MODE_LABEL, TASK_MODE_LABEL, TASK_MODE_TITLE } from '../common/graph-task.const.ts';
import { CLEAR_TITLE, CONTROLS_TITLE, DETAILS_TITLE, EXPORT_TITLE, FIT_TITLE, RELAYOUT_TITLE } from '../common/graph.const.ts';
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

    it('WHEN each button is read THEN it has its spec title', () => {
      const { taskMode, controls, details, fit, relayout, exportImage, clear } = elements;
      const buttons = [taskMode, controls, details, fit, relayout, exportImage, clear];
      const titles = buttons.map((button): string => button.title);

      expect(titles).toStrictEqual([
        TASK_MODE_TITLE,
        CONTROLS_TITLE,
        DETAILS_TITLE,
        FIT_TITLE,
        RELAYOUT_TITLE,
        EXPORT_TITLE,
        CLEAR_TITLE
      ]);
    });

    it('WHEN its second part is read THEN it is a separator', () => {
      const second = elements.toolbar.children[1];

      expect(second?.className).toBe('toolbar-separator');
      expect(second?.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
