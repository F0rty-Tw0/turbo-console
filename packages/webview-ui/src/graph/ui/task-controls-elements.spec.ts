import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTaskControls } from './task-controls-elements.ts';
import { SEARCH_TASKS_LABEL, SHOW_SCRIPTS_LABEL, TASK_CONTROLS_ID } from '../common/graph-task.const.ts';
import {
  GROUP_BY_FOLDER_LABEL,
  PROJECTS_SECTION_TITLE,
  SCOPE_TOGGLE_LABEL,
  SEARCH_SECTION_TITLE,
  VIEW_SECTION_TITLE
} from '../common/graph.const.ts';
import type { TaskControlsElements } from '../common/task-controls.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { childAt } from '../test/utils/html-child.spec.util.ts';

describe('FEATURE: task controls elements', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN buildTaskControls', () => {
    it('WHEN built THEN Search tasks, Dependents depth 0-5 = 1 and the rows exist', () => {
      const els = buildTaskControls();

      expect(els.search.getAttribute('aria-label')).toBe(SEARCH_TASKS_LABEL);
      expect(els.depth).toMatchObject({ min: '0', max: '5', value: '1' });
      expect(els.list.getAttribute('role')).toBe('grid');
    });

    describe('WHEN its panel is read', () => {
      let elements: TaskControlsElements;

      beforeEach((): void => {
        elements = buildTaskControls();
      });

      it('THEN it holds three children', () => {
        expect(elements.panel.children).toHaveLength(3);
      });

      it('THEN the Search section comes first', () => {
        const searchSection = childAt(elements.panel, 0);
        const heading = searchSection.children[0]?.textContent;

        expect([searchSection.tagName, heading]).toStrictEqual(['SECTION', SEARCH_SECTION_TITLE]);
      });

      it('THEN the Search section holds the search box', () => {
        const searchField = childAt(childAt(elements.panel, 0), 1);

        expect(searchField.children).toContain(elements.search);
      });

      it('THEN the View section comes second', () => {
        const viewSection = childAt(elements.panel, 1);
        const heading = viewSection.children[0]?.textContent;

        expect([viewSection.tagName, heading]).toStrictEqual(['SECTION', VIEW_SECTION_TITLE]);
      });

      it('THEN the Projects section comes last', () => {
        const projectsSection = childAt(elements.panel, 2);
        const heading = projectsSection.children[0]?.textContent;

        expect([projectsSection.tagName, heading]).toStrictEqual(['SECTION', PROJECTS_SECTION_TITLE]);
      });

      it('THEN the Projects section holds the grid', () => {
        const projectsSection = childAt(elements.panel, 2);

        expect(childAt(projectsSection, 1)).toBe(elements.list);
      });
    });

    describe('WHEN its View section is read', () => {
      let elements: TaskControlsElements;
      let viewSection: HTMLElement;

      beforeEach((): void => {
        elements = buildTaskControls();
        viewSection = childAt(elements.panel, 1);
      });

      it('THEN the depth field group, its input in the label, comes first', () => {
        const depthGroup = childAt(viewSection, 1);
        const depthLabel = childAt(depthGroup, 0);

        expect([depthGroup.children.length, depthLabel.children[1]]).toStrictEqual([2, elements.depth]);
      });

      it('THEN Group by folder, Show package scopes and Show scripts follow it', () => {
        const [, , ...checks] = viewSection.children;
        const labels = checks.map((check) => check.textContent);

        expect(labels).toStrictEqual([GROUP_BY_FOLDER_LABEL, SCOPE_TOGGLE_LABEL, SHOW_SCRIPTS_LABEL]);
      });
    });

    describe('WHEN its View boxes are read', () => {
      let elements: TaskControlsElements;
      let boxes: HTMLInputElement[];

      beforeEach((): void => {
        elements = buildTaskControls();
        boxes = [elements.grouping, elements.scope, elements.scripts];
      });

      it('THEN all three are checkboxes', () => {
        const types = boxes.map((box) => box.type);

        expect(types).toStrictEqual(['checkbox', 'checkbox', 'checkbox']);
      });

      it('THEN none is ticked', () => {
        const ticked = boxes.filter((box) => box.checked);

        expect(ticked).toStrictEqual([]);
      });

      it('THEN Group by folder and Show scripts sit first in their labels', () => {
        const firsts = [elements.groupingField.children[0], elements.scriptsField.children[0]];

        expect(firsts).toStrictEqual([elements.grouping, elements.scripts]);
      });
    });

    it('WHEN built THEN Show scripts starts hidden and Group by folder does not', () => {
      const { groupingField, scriptsField } = buildTaskControls();

      expect([groupingField.hidden, scriptsField.hidden]).toStrictEqual([false, true]);
    });

    it('WHEN built THEN the panel is the hidden aside #graph-task-controls', () => {
      const { panel } = buildTaskControls();

      expect(panel).toMatchObject({ tagName: 'ASIDE', id: TASK_CONTROLS_ID, hidden: true });
    });
  });
});
