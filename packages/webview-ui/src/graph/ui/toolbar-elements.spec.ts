import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildToolbar } from './toolbar-elements.ts';
import {
  MODE_LABEL,
  PACKAGES_MODE_LABEL,
  PACKAGES_MODE_TITLE,
  TASKS_MODE_LABEL,
  TASKS_MODE_TITLE
} from '../common/graph-task.const.ts';
import type { ToolbarElements } from '../common/graph-toolbar.type.ts';
import {
  CONTROLS_TITLE,
  DETAILS_TITLE,
  EXPORT_LABEL,
  EXPORT_TITLE,
  FIT_LABEL,
  FIT_TITLE,
  RELAYOUT_LABEL,
  RELAYOUT_TITLE
} from '../common/graph.const.ts';
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
    it('WHEN its first part is read THEN it is the Mode group', () => {
      const first = elements.toolbar.children[0];

      expect(first?.getAttribute('aria-label')).toBe(MODE_LABEL);
    });

    it('WHEN the Mode group is read THEN it holds Packages, then Tasks', () => {
      const first = elements.toolbar.children[0];

      expect([first?.children[0], first?.children[1]]).toStrictEqual([elements.packagesMode, elements.taskMode]);
    });

    describe('WHEN a mode button is read THEN it is disabled, named and pressed or not', () => {
      const rows = [
        ['packagesMode', PACKAGES_MODE_LABEL, 'true'],
        ['taskMode', TASKS_MODE_LABEL, 'false']
      ] as const;

      it.each(rows)('THEN %s is disabled, named %s and has aria-pressed %s', (key, label, pressed) => {
        const button = elements[key];

        expect([button.disabled, button.children[1]?.textContent, button.getAttribute('aria-pressed')]).toStrictEqual([
          true,
          label,
          pressed
        ]);
      });
    });

    it('WHEN each button is read THEN it has its spec title', () => {
      const { packagesMode, taskMode, controls, details, fit, relayout, exportImage } = elements;
      const buttons = [packagesMode, taskMode, controls, details, fit, relayout, exportImage];
      const titles = buttons.map((button): string => button.title);

      expect(titles).toStrictEqual([
        PACKAGES_MODE_TITLE,
        TASKS_MODE_TITLE,
        CONTROLS_TITLE,
        DETAILS_TITLE,
        FIT_TITLE,
        RELAYOUT_TITLE,
        EXPORT_TITLE
      ]);
    });

    describe('WHEN a View action is read THEN it is a disabled icon-only button', () => {
      const rows = [
        ['fit', FIT_LABEL, FIT_TITLE],
        ['relayout', RELAYOUT_LABEL, RELAYOUT_TITLE],
        ['exportImage', EXPORT_LABEL, EXPORT_TITLE]
      ] as const;

      it.each(rows)('THEN %s is an icon-button with one child, its aria-label, its title and disabled', (key, label, title) => {
        const button = elements[key];

        expect([
          button.className,
          button.children.length,
          button.getAttribute('aria-label'),
          button.title,
          button.disabled
        ]).toStrictEqual(['icon-button', 1, label, title, true]);
      });
    });

    it('WHEN its second part is read THEN it is a separator', () => {
      const second = elements.toolbar.children[1];

      expect(second?.className).toBe('toolbar-separator');
      expect(second?.getAttribute('aria-hidden')).toBe('true');
    });

    it('WHEN its own children are read THEN none is a button, so Clear selection is not in it', () => {
      const children = Array.from(elements.toolbar.children);
      const tags = children.map((child): string => child.tagName);

      expect(tags).not.toContain('BUTTON');
    });

    it('WHEN its own children are read THEN exactly two are separators', () => {
      const children = Array.from(elements.toolbar.children);
      const separators = children.filter((child): boolean => child.className === 'toolbar-separator');

      expect(separators).toHaveLength(2);
    });

    it('WHEN the status line is read THEN it is last and visually hidden', () => {
      const last = elements.toolbar.children[elements.toolbar.children.length - 1];

      expect(last).toBe(elements.status);
      expect(elements.status.className).toBe('graph-status visually-hidden');
    });
  });
});
