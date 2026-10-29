import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskToolbar } from './task-toolbar.ts';
import type { TaskToolbarDeps } from '../common/task-details.type.ts';
import type { TaskToolbarElements } from '../common/task-toolbar.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
import { accessLogOf } from '../test/utils/access-log.spec.util.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';

type ToolbarRig = {
  readonly toolbar: TaskToolbar;
  readonly layer: HTMLElement;
  readonly container: HTMLElement;
  readonly deps: TaskToolbarDeps;
  readonly built: TaskToolbarElements[];
};

const rigOf = (): ToolbarRig => {
  const layer = document.createElement('div');
  const container = document.createElement('div');
  const { views, taskToolbars: built } = widgetRowViewsMock();
  const deps: TaskToolbarDeps = { layer, container, views, onMenu: vi.fn() };
  const toolbar = new TaskToolbar(deps);
  const rig: ToolbarRig = { toolbar, layer, container, deps, built };

  return rig;
};

const latestOf = (rig: ToolbarRig): TaskToolbarElements => {
  const latest = rig.built.at(-1);

  if (latest === undefined) throw new Error('no toolbar was built');

  return latest;
};

const AT_BUILD = rectOf(156, 22, 180, 46);

describe('FEATURE: TaskToolbar', () => {
  let rig: ToolbarRig;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the app#build toolbar is synced twice', () => {
    it('WHEN the layer is read THEN it holds the one root, the same element', () => {
      rig.toolbar.sync('app#build');
      const first = rig.layer.children[0];

      rig.toolbar.sync('app#build');

      expect(rig.layer.children).toHaveLength(1);
      expect(rig.layer.children[0]).toBe(first);
      expect(rig.toolbar.id()).toBe('app#build');
    });
  });

  describe('GIVEN the toolbar of app#build, then lib#build is selected', () => {
    it('WHEN the layer is read THEN the old root is gone and the one new root is first', () => {
      rig.toolbar.sync('app#build');
      const old = latestOf(rig).root;

      rig.layer.append(document.createElement('div'));
      rig.toolbar.sync('lib#build');

      expect(Array.from(rig.layer.children)).not.toContain(old);
      expect(rig.layer.children).toHaveLength(2);
      expect(rig.layer.children[0]).toBe(latestOf(rig).root);
      expect(rig.toolbar.id()).toBe('lib#build');
    });
  });

  describe('GIVEN focus on the "…" of the toolbar', () => {
    beforeEach((): void => {
      rig.toolbar.sync('app#build');
      rig.toolbar.place(AT_BUILD);
      latestOf(rig).ellipsis.focus();
    });

    it('WHEN the selection clears THEN the container has focus', () => {
      rig.toolbar.sync(null);

      expect(document.activeElement).toBe(rig.container);
      expect(rig.toolbar.id()).toBeNull();
    });

    it('WHEN the toolbar is placed at null THEN it hides and the container has focus', () => {
      rig.toolbar.place(null);

      expect(latestOf(rig).root.hidden).toBe(true);
      expect(document.activeElement).toBe(rig.container);
    });
  });

  describe('GIVEN focus elsewhere', () => {
    it('WHEN the selection clears THEN focus stays there', () => {
      const other = document.createElement('button');

      rig.toolbar.sync('app#build');
      other.focus();
      rig.toolbar.sync(null);

      expect(document.activeElement).toBe(other);
    });
  });

  describe('GIVEN the toolbar of app#build', () => {
    beforeEach((): void => {
      rig.toolbar.sync('app#build');
    });

    it('WHEN it is placed at a rect THEN it shows there on whole px', () => {
      rig.toolbar.place(AT_BUILD);

      expect(latestOf(rig).root.hidden).toBe(false);
      expect(latestOf(rig).root.style.transform).toBe('translate(156px, 22px)');
    });

    it('WHEN it is placed at null THEN it is hidden', () => {
      rig.toolbar.place(AT_BUILD);
      rig.toolbar.place(null);

      expect(latestOf(rig).root.hidden).toBe(true);
    });

    it('WHEN the "…" is clicked THEN the menu opens on it', () => {
      const { ellipsis } = latestOf(rig);

      ellipsis.click();

      expect(rig.deps.onMenu).toHaveBeenCalledExactlyOnceWith(ellipsis);
    });

    it('WHEN it is placed twice at the same rect THEN the second pass writes and reads nothing', () => {
      const { root, ellipsis } = latestOf(rig);

      rig.toolbar.place(AT_BUILD);
      const log = accessLogOf([root, ellipsis]);

      rig.toolbar.place(AT_BUILD);

      expect(log).toStrictEqual([]);
    });
  });

  describe('GIVEN no toolbar', () => {
    it('WHEN it is placed THEN nothing happens and it has no "…"', () => {
      rig.toolbar.place(AT_BUILD);

      expect(rig.toolbar.ellipsis()).toBeNull();
      expect(rig.layer.children).toHaveLength(0);
    });
  });
});
