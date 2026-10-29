import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackageToolbar } from './package-toolbar.ts';
import type { PackageToolbarDeps } from '../common/graph-widgets.type.ts';
import type { MenuTarget, RectPx } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';

type ToolbarRig = {
  readonly toolbar: PackageToolbar;
  readonly layer: HTMLElement;
  readonly container: HTMLElement;
  readonly onMenu: PackageToolbarDeps['onMenu'];
};

const rectOf = (x1: number, y1: number, x2: number, y2: number): RectPx => {
  const rect: RectPx = { x1, y1, x2, y2 };

  return rect;
};

const rigOf = (): ToolbarRig => {
  const layer = document.createElement('div');
  const container = document.createElement('div');
  const onMenu = vi.fn();
  const { views } = widgetRowViewsMock();
  const deps: PackageToolbarDeps = { layer, container, views, onMenu };
  const toolbar = new PackageToolbar(deps);
  const rig: ToolbarRig = { toolbar, layer, container, onMenu };

  return rig;
};

describe('FEATURE: PackageToolbar', () => {
  let rig: ToolbarRig;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the web toolbar is synced twice', () => {
    it('WHEN the layer is read THEN it holds the one root, the same element', () => {
      rig.toolbar.sync('web');
      const first = rig.layer.children[0];

      rig.toolbar.sync('web');

      expect(rig.layer.children).toHaveLength(1);
      expect(rig.layer.children[0]).toBe(first);
    });
  });

  describe('GIVEN the web toolbar is replaced by docs, with a row already in the layer', () => {
    it('WHEN the layer is read THEN the web root is gone and the docs root comes first', () => {
      const row = document.createElement('div');

      rig.layer.append(row);
      rig.toolbar.sync('web');
      const web = rig.layer.children[0];

      rig.toolbar.sync('docs');

      expect(rig.layer.children).not.toContain(web);
      expect(rig.layer.children).toHaveLength(2);
      expect(rig.layer.children[0]?.getAttribute('aria-label')).toBe('Package docs');
      expect(rig.layer.children[1]).toBe(row);
    });
  });

  describe('GIVEN the "…" of the web toolbar has focus', () => {
    beforeEach((): void => {
      rig.toolbar.sync('web');
      rig.toolbar.ellipsis()?.focus();
    });

    it('WHEN the selection clears THEN the container has focus', () => {
      rig.toolbar.sync(null);

      expect(document.activeElement).toBe(rig.container);
    });

    it('WHEN the toolbar is placed nowhere THEN the container has focus', () => {
      rig.toolbar.place(null);

      expect(document.activeElement).toBe(rig.container);
    });
  });

  describe('GIVEN focus is elsewhere', () => {
    it('WHEN the selection clears THEN focus stays there', () => {
      const other = document.createElement('button');

      rig.toolbar.sync('web');
      other.focus();
      rig.toolbar.sync(null);

      expect(document.activeElement).toBe(other);
    });
  });

  describe('GIVEN the web toolbar', () => {
    beforeEach((): void => {
      rig.toolbar.sync('web');
    });

    it('WHEN it is placed nowhere THEN its root is hidden', () => {
      rig.toolbar.place(rectOf(100, 50, 124, 74));
      rig.toolbar.place(null);

      expect(rig.layer.children[0]).toHaveProperty('hidden', true);
    });

    it('WHEN it is placed at {100, 50, 124, 74} THEN its root is shown at translate(100px, 50px)', () => {
      rig.toolbar.place(rectOf(100, 50, 124, 74));

      expect(rig.layer.children[0]).toHaveProperty('hidden', false);
      expect(rig.layer.children[0]).toHaveProperty('style.transform', 'translate(100px, 50px)');
    });

    it('WHEN its "…" is clicked THEN the package menu opens from it', () => {
      const ellipsis = rig.toolbar.ellipsis();
      const target: MenuTarget = { kind: 'package', name: 'web' };

      ellipsis?.click();

      expect(rig.onMenu).toHaveBeenCalledWith(target, ellipsis);
    });
  });

  describe('GIVEN no toolbar', () => {
    it('WHEN its name and "…" are read THEN both are null', () => {
      expect(rig.toolbar.name()).toBeNull();
      expect(rig.toolbar.ellipsis()).toBeNull();
    });
  });
});
