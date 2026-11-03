import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { TaskGrid } from './task-grid.ts';
import type { TaskGridFacts } from '../common/task-grid.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskGridBuildMock } from '../test/mocks/task-grid-build.mock.ts';
import { GRID_GROUPED_NAMING_STUB, TASK_GRID_FACTS_STUB } from '../test/stubs/task-grid.stub.ts';
import { childAt } from '../test/utils/html-child.spec.util.ts';
import { pressKey } from '../test/utils/key-events.spec.util.ts';

type GridRig = {
  readonly list: HTMLElement;
  readonly grid: TaskGrid;
  readonly onPick: Mock<(id: string) => void>;
};

const rigOf = (searchOf: () => string): GridRig => {
  const list = document.createElement('div');
  const onPick = vi.fn<(id: string) => void>();
  const rig: GridRig = {
    list,
    grid: new TaskGrid(list, { build: taskGridBuildMock, search: searchOf, onPick }),
    onPick
  };

  return rig;
};

const rowAt = (list: HTMLElement, index: number): HTMLElement => childAt(list, index);

const checkAt = (list: HTMLElement, index: number): HTMLElement => childAt(childAt(rowAt(list, index), 0), 0);

const nameAt = (list: HTMLElement, index: number): HTMLElement => childAt(childAt(rowAt(list, index), 1), 0);

const titlesOf = (list: HTMLElement): string[] => {
  const indexes = Array.from(list.children, (_row, index) => index);

  return indexes.map((index) => nameAt(list, index).title);
};

const tabStopsOf = (list: HTMLElement): string[] => {
  const indexes = Array.from(list.children, (_row, index) => index);
  const cells = indexes.flatMap((index) => [checkAt(list, index), nameAt(list, index)]);
  const stops = cells.filter((cell) => cell.tabIndex === 0);

  return stops.map((cell) => cell.getAttribute('aria-label') ?? cell.title);
};

const FLAT_TITLES = ['Workspace root (//) (1)', '-tools (1)', 'core (1)', 'root-lib (1)', 'ui (2)', 'web (2)'];

describe('FEATURE: TaskGrid', () => {
  let rig: GridRig;
  let search = '';

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    search = '';
    rig = rigOf(() => search);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN flat facts', () => {
    beforeEach(() => {
      rig.grid.setFacts(TASK_GRID_FACTS_STUB);
    });

    it('WHEN the facts are set THEN the list holds the project rows in order', () => {
      expect(titlesOf(rig.list)).toStrictEqual(FLAT_TITLES);
    });

    it('WHEN the facts are set THEN the first check is the one Tab stop', () => {
      expect(tabStopsOf(rig.list)).toStrictEqual(['Choose tasks of Workspace root (//)']);
    });

    it('WHEN a project name is clicked THEN its task rows follow it and it reads expanded', () => {
      nameAt(rig.list, 5).click();

      expect(titlesOf(rig.list).slice(-3)).toStrictEqual(['web (2)', 'web#build', 'web#dev']);
      expect(nameAt(rig.list, 5).getAttribute('aria-expanded')).toBe('true');
    });

    it('WHEN a project name is clicked twice THEN its task rows are gone again', () => {
      nameAt(rig.list, 5).click();
      nameAt(rig.list, 5).click();

      expect(titlesOf(rig.list)).toStrictEqual(FLAT_TITLES);
    });

    it('WHEN the focused project name is clicked THEN the new button of the same project has focus', () => {
      nameAt(rig.list, 5).focus();
      nameAt(rig.list, 5).click();

      expect(document.activeElement).toBe(nameAt(rig.list, 5));
    });

    it('WHEN web is open and the facts are set again THEN web is still open', () => {
      nameAt(rig.list, 5).click();
      rig.grid.setFacts({ ...TASK_GRID_FACTS_STUB });

      expect(titlesOf(rig.list).slice(-3)).toStrictEqual(['web (2)', 'web#build', 'web#dev']);
    });

    it('WHEN a mixed project is painted THEN its check is indeterminate and no pick fires', () => {
      expect(checkAt(rig.list, 4)).toMatchObject({ checked: false, indeterminate: true });
      expect(rig.onPick).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN ui open and focus on its ui#build name button', () => {
    beforeEach(() => {
      rig.grid.setFacts(TASK_GRID_FACTS_STUB);
      nameAt(rig.list, 4).click();
      nameAt(rig.list, 5).focus();
    });

    it('WHEN the facts are set again THEN focus and the Tab stop sit on the new ui#build name button', () => {
      const old = nameAt(rig.list, 5);

      rig.grid.setFacts({ ...TASK_GRID_FACTS_STUB });

      expect(document.activeElement).toBe(nameAt(rig.list, 5));
      expect(nameAt(rig.list, 5)).not.toBe(old);
      expect(nameAt(rig.list, 5).tabIndex).toBe(0);
      expect(tabStopsOf(rig.list)).toStrictEqual(['ui#build']);
    });

    it('WHEN the drawn ui#build name is clicked THEN its id is picked', () => {
      nameAt(rig.list, 5).click();

      expect(rig.onPick).toHaveBeenCalledExactlyOnceWith('ui#build');
    });

    it('WHEN the undrawn ui#test name is clicked THEN nothing is picked', () => {
      nameAt(rig.list, 6).click();

      expect(rig.onPick).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN flat facts and a key pressed on the first project check', () => {
    beforeEach(() => {
      rig.grid.setFacts(TASK_GRID_FACTS_STUB);
    });

    it('WHEN ArrowDown is pressed THEN the next row check takes focus and the Tab stop', () => {
      const isPrevented = pressKey(rig.list, 'ArrowDown', checkAt(rig.list, 0));

      expect(isPrevented).toBe(true);
      expect(document.activeElement).toBe(checkAt(rig.list, 1));
      expect(checkAt(rig.list, 1).tabIndex).toBe(0);
      expect(checkAt(rig.list, 0).tabIndex).toBe(-1);
    });

    it('WHEN ArrowRight is pressed THEN the name button of the same row takes focus', () => {
      pressKey(rig.list, 'ArrowRight', checkAt(rig.list, 0));

      expect(document.activeElement).toBe(nameAt(rig.list, 0));
    });

    it('WHEN End is pressed THEN the last row takes focus', () => {
      pressKey(rig.list, 'End', checkAt(rig.list, 0));

      expect(document.activeElement).toBe(checkAt(rig.list, 5));
    });

    it('WHEN a key is pressed on the list itself THEN focus stays and the default runs', () => {
      const isPrevented = pressKey(rig.list, 'End', rig.list);

      expect(isPrevented).toBe(false);
      expect(document.activeElement).toBeNull();
    });
  });

  describe('GIVEN grouped facts', () => {
    const grouped: TaskGridFacts = { ...TASK_GRID_FACTS_STUB, naming: GRID_GROUPED_NAMING_STUB };

    beforeEach(() => {
      rig.grid.setFacts(grouped);
    });

    it('WHEN the facts are set THEN folder rows lead their projects', () => {
      expect(titlesOf(rig.list).slice(0, 4)).toStrictEqual(['(root)', 'Workspace root (//) (1)', 'root-lib (1)', 'apps']);
    });

    it('WHEN the packages folder name is clicked THEN its projects are gone', () => {
      nameAt(rig.list, 5).click();

      expect(titlesOf(rig.list).slice(-2)).toStrictEqual(['web (2)', 'packages']);
    });
  });

  describe('GIVEN flat facts and a search text', () => {
    beforeEach(() => {
      rig.grid.setFacts(TASK_GRID_FACTS_STUB);
    });

    it('WHEN the search reads web and the grid paints THEN only the web project is listed', () => {
      search = 'web';
      rig.grid.paint();

      expect(titlesOf(rig.list)).toStrictEqual(['web (2)']);
    });

    it('WHEN the search reads zzz and the grid paints THEN the list is empty', () => {
      search = 'zzz';
      rig.grid.paint();

      expect(titlesOf(rig.list)).toStrictEqual([]);
    });
  });
});
