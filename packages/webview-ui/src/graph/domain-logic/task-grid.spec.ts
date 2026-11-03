import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { TaskGrid } from './task-grid.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import type { TaskGridFacts } from '../common/task-grid.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskGridBuildMock } from '../test/mocks/task-grid-build.mock.ts';
import { GRID_NAMING_STUB, GRID_TASKS_STUB, TASK_GRID_FACTS_STUB } from '../test/stubs/task-grid.stub.ts';
import { pressKey } from '../test/utils/key-events.spec.util.ts';
import { checkAt, nameAt, tick } from '../test/utils/task-grid-cells.spec.util.ts';

type GridRig = {
  readonly list: HTMLElement;
  readonly grid: TaskGrid;
  readonly onPick: Mock<(id: string) => void>;
  readonly onCheck: Mock<(ids: string[], isChecked: boolean) => void>;
};

const rigOf = (searchOf: () => string): GridRig => {
  const list = document.createElement('div');
  const onPick = vi.fn<(id: string) => void>();
  const onCheck = vi.fn<(ids: string[], isChecked: boolean) => void>();
  const rig: GridRig = {
    list,
    grid: new TaskGrid(list, { build: taskGridBuildMock, search: searchOf, onPick, onCheck }),
    onPick,
    onCheck
  };

  return rig;
};

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

const GROUPED_NAMING: TaskNaming = { ...GRID_NAMING_STUB, grouped: true };

const GROUPED_FACTS: TaskGridFacts = { ...TASK_GRID_FACTS_STUB, naming: GROUPED_NAMING };

/** The flat facts without `ui#build`. */
const NO_UI_BUILD: TaskGridFacts = { ...TASK_GRID_FACTS_STUB, tasks: GRID_TASKS_STUB.filter((task) => task.id !== 'ui#build') };

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

    describe('WHEN a project name is clicked', () => {
      it('THEN its task rows follow it', () => {
        nameAt(rig.list, 5).click();

        expect(titlesOf(rig.list).slice(-3)).toStrictEqual(['web (2)', 'web#build', 'web#dev']);
      });

      it('THEN it reads expanded', () => {
        nameAt(rig.list, 5).click();

        expect(nameAt(rig.list, 5).getAttribute('aria-expanded')).toBe('true');
      });
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

    describe('WHEN a mixed project is painted', () => {
      it('THEN its check is indeterminate', () => {
        expect(checkAt(rig.list, 4)).toMatchObject({ checked: false, indeterminate: true });
      });

      it('THEN no pick fires', () => {
        expect(rig.onPick).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN ui open and focus on its ui#build name button', () => {
    beforeEach(() => {
      rig.grid.setFacts(TASK_GRID_FACTS_STUB);
      nameAt(rig.list, 4).click();
      nameAt(rig.list, 5).focus();
    });

    describe('WHEN the facts are set again', () => {
      it('THEN focus sits on the new ui#build name button', () => {
        const old = nameAt(rig.list, 5);

        rig.grid.setFacts({ ...TASK_GRID_FACTS_STUB });

        expect(document.activeElement).toBe(nameAt(rig.list, 5));
        expect(nameAt(rig.list, 5)).not.toBe(old);
      });

      it('THEN the new ui#build name button is the one Tab stop', () => {
        rig.grid.setFacts({ ...TASK_GRID_FACTS_STUB });

        expect(tabStopsOf(rig.list)).toStrictEqual(['ui#build']);
      });
    });

    it('WHEN facts arrive without ui#build THEN the stop cell, the first check, has focus', () => {
      rig.grid.setFacts(NO_UI_BUILD);

      expect(document.activeElement).toBe(checkAt(rig.list, 0));
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

    describe('WHEN ArrowDown is pressed', () => {
      it('THEN the default is prevented', () => {
        const isPrevented = pressKey(rig.list, 'ArrowDown', checkAt(rig.list, 0));

        expect(isPrevented).toBe(true);
      });

      it('THEN the next row check takes focus', () => {
        pressKey(rig.list, 'ArrowDown', checkAt(rig.list, 0));

        expect(document.activeElement).toBe(checkAt(rig.list, 1));
      });

      it('THEN the next row check takes the Tab stop', () => {
        pressKey(rig.list, 'ArrowDown', checkAt(rig.list, 0));

        expect(tabStopsOf(rig.list)).toStrictEqual(['Choose tasks of -tools']);
      });
    });

    it('WHEN ArrowRight is pressed THEN the name button of the same row takes focus', () => {
      pressKey(rig.list, 'ArrowRight', checkAt(rig.list, 0));

      expect(document.activeElement).toBe(nameAt(rig.list, 0));
    });

    it('WHEN End is pressed THEN the last row takes focus', () => {
      pressKey(rig.list, 'End', checkAt(rig.list, 0));

      expect(document.activeElement).toBe(checkAt(rig.list, 5));
    });

    describe('WHEN a, a key the grid does not move on, is pressed', () => {
      it('THEN focus stays on the check', () => {
        checkAt(rig.list, 0).focus();

        pressKey(rig.list, 'a', checkAt(rig.list, 0));

        expect(document.activeElement).toBe(checkAt(rig.list, 0));
      });

      it('THEN the default is not prevented', () => {
        const isPrevented = pressKey(rig.list, 'a', checkAt(rig.list, 0));

        expect(isPrevented).toBe(false);
      });
    });

    describe('WHEN a key is pressed on the list itself', () => {
      it('THEN the default runs', () => {
        const isPrevented = pressKey(rig.list, 'End', rig.list);

        expect(isPrevented).toBe(false);
      });

      it('THEN focus stays where it was', () => {
        pressKey(rig.list, 'End', rig.list);

        expect(document.activeElement).toBeNull();
      });
    });
  });

  describe('GIVEN grouped facts', () => {
    beforeEach(() => {
      rig.grid.setFacts(GROUPED_FACTS);
    });

    it('WHEN the facts are set THEN folder rows lead their projects', () => {
      expect(titlesOf(rig.list).slice(0, 4)).toStrictEqual(['(root)', 'Workspace root (//) (1)', 'root-lib (1)', 'apps']);
    });

    it('WHEN the packages folder name is clicked THEN its projects are gone', () => {
      nameAt(rig.list, 5).click();

      expect(titlesOf(rig.list).slice(-2)).toStrictEqual(['web (2)', 'packages']);
    });

    it('WHEN the packages folder is ticked THEN onCheck gets the ids of every pool task of its projects', () => {
      tick(checkAt(rig.list, 5), true);

      expect(rig.onCheck).toHaveBeenCalledExactlyOnceWith(['-tools#build', 'core#build', 'ui#build', 'ui#test'], true);
    });

    it('WHEN the search lists only ui and the folder is ticked THEN onCheck still gets core, -tools and ui', () => {
      search = 'test';
      rig.grid.paint();

      tick(checkAt(rig.list, 0), true);

      expect(rig.onCheck).toHaveBeenCalledExactlyOnceWith(['-tools#build', 'core#build', 'ui#build', 'ui#test'], true);
    });
  });

  describe('GIVEN flat facts and a search text', () => {
    beforeEach(() => {
      rig.grid.setFacts(TASK_GRID_FACTS_STUB);
    });

    it('WHEN the search reads web and the grid paints THEN only the web project is listed, open on its tasks', () => {
      search = 'web';
      rig.grid.paint();

      expect(titlesOf(rig.list)).toStrictEqual(['web (2)', 'web#build', 'web#dev']);
    });

    it('WHEN the search reads zzz and the grid paints THEN the list is empty', () => {
      search = 'zzz';
      rig.grid.paint();

      expect(titlesOf(rig.list)).toStrictEqual([]);
    });
  });

  describe('GIVEN flat facts with web open, the checks report', () => {
    beforeEach(() => {
      rig.grid.setFacts(TASK_GRID_FACTS_STUB);
      nameAt(rig.list, 5).click();
    });

    it('WHEN the unchecked web project is ticked THEN onCheck gets its ids and true', () => {
      tick(checkAt(rig.list, 5), true);

      expect(rig.onCheck).toHaveBeenCalledExactlyOnceWith(['web#build', 'web#dev'], true);
    });

    it('WHEN the checked ui project is unticked after ui#test joined THEN onCheck gets its ids and false', () => {
      rig.grid.setFacts({ ...TASK_GRID_FACTS_STUB, chosen: new Set(['ui#build', 'ui#test']) });

      tick(checkAt(rig.list, 4), false);

      expect(rig.onCheck).toHaveBeenCalledExactlyOnceWith(['ui#build', 'ui#test'], false);
    });

    it('WHEN the mixed ui project is activated and its box reads checked THEN onCheck gets its ids and true', () => {
      tick(checkAt(rig.list, 4), true);

      expect(rig.onCheck).toHaveBeenCalledExactlyOnceWith(['ui#build', 'ui#test'], true);
    });

    it('WHEN a task check is ticked THEN onCheck gets that task id alone', () => {
      tick(checkAt(rig.list, 6), true);

      expect(rig.onCheck).toHaveBeenCalledExactlyOnceWith(['web#build'], true);
    });

    it('WHEN the facts are set again with another choice THEN the repaint reports no check', () => {
      rig.grid.setFacts({ ...TASK_GRID_FACTS_STUB, chosen: new Set(['web#build', 'web#dev']) });

      expect(rig.onCheck).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN flat facts and the search test painted', () => {
    beforeEach(() => {
      rig.grid.setFacts(TASK_GRID_FACTS_STUB);
      search = 'test';
      rig.grid.paint();
    });

    it('WHEN the grid is read THEN only ui is listed, open on ui#test', () => {
      expect(titlesOf(rig.list)).toStrictEqual(['ui (2)', 'ui#test']);
    });

    it('WHEN the search is cleared and the grid paints THEN ui is closed again, the search having toggled nothing', () => {
      search = '';
      rig.grid.paint();

      expect(titlesOf(rig.list)).toStrictEqual(FLAT_TITLES);
    });

    it('WHEN the ui disclosure is clicked THEN ui stays open', () => {
      nameAt(rig.list, 0).click();

      expect(titlesOf(rig.list)).toStrictEqual(['ui (2)', 'ui#test']);
    });

    it('WHEN the ui disclosure is clicked and the search is cleared THEN ui is open from the click', () => {
      nameAt(rig.list, 0).click();
      search = '';
      rig.grid.paint();

      expect(titlesOf(rig.list).slice(4, 7)).toStrictEqual(['ui (2)', 'ui#build', 'ui#test']);
    });
  });
});
