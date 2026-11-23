import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildModuleControls } from './module-controls-elements.ts';
import type { ModuleControlsElements } from '../common/module-controls.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const headingOf = (section: Element): string | undefined => section.children[0]?.textContent;

describe('FEATURE: module Controls elements', () => {
  let elements: ModuleControlsElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    elements = buildModuleControls();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the panel built in an empty document', () => {
    it('WHEN the panel is read THEN it is a hidden aside#graph-module-controls', () => {
      const { panel } = elements;

      expect([panel.tagName, panel.id, panel.hidden]).toStrictEqual(['ASIDE', 'graph-module-controls', true]);
    });

    it('WHEN its sections are read THEN their titles read Focus, then View', () => {
      const titles = Array.from(elements.panel.children, headingOf);

      expect(titles).toStrictEqual(['Focus', 'View']);
    });

    it('WHEN Focus is read THEN it reads None and Clear focus is hidden', () => {
      expect([elements.target.textContent, elements.clearFocus.hidden]).toStrictEqual(['None', true]);
    });

    it('WHEN the depth input is read THEN it is described by graph-module-depth-hint, not graph-depth-hint', () => {
      expect(elements.depth.getAttribute('aria-describedby')).toBe('graph-module-depth-hint');
    });

    it('WHEN the buttons are read THEN they read Clear focus and Reset view', () => {
      expect([elements.clearFocus.textContent, elements.reset.textContent]).toStrictEqual(['Clear focus', 'Reset view']);
    });
  });
});
