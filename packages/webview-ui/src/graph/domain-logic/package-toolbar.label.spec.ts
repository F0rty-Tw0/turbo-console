import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackageToolbar } from './package-toolbar.ts';
import type { PackageToolbarDeps } from '../common/graph-widgets.type.ts';
import type { MenuTarget, PackageMenuState } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';

type LabelRig = {
  readonly toolbar: PackageToolbar;
  readonly layer: HTMLElement;
  readonly deps: PackageToolbarDeps;
  readonly labels: Map<string, string>;
};

const NO_TASKS: PackageMenuState = { isFocus: false, hasTasks: false };

const SCOPED = '@org/x';

const rigOf = (): LabelRig => {
  const layer = document.createElement('div');
  const container = document.createElement('div');
  const { views } = widgetRowViewsMock();
  const labels = new Map([[SCOPED, 'x']]);
  const deps: PackageToolbarDeps = {
    layer,
    container,
    views,
    labelOf: (name: string): string => labels.get(name) ?? name,
    onMenu: vi.fn(),
    onFocus: vi.fn(),
    onStartTrace: vi.fn(),
    onShowTasks: vi.fn(),
    onCollapse: vi.fn()
  };
  const toolbar = new PackageToolbar(deps);
  const rig: LabelRig = { toolbar, layer, deps, labels };

  return rig;
};

const rootOf = (rig: LabelRig): Element => {
  const root = rig.layer.children[0];

  if (root === undefined) throw new Error('no toolbar root in the layer');

  return root;
};

describe('FEATURE: PackageToolbar names follow the package label', () => {
  let rig: LabelRig;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
    rig.toolbar.sync(SCOPED, null, NO_TASKS);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN @org/x labelled x is selected', () => {
    it('WHEN the toolbar is read THEN its name, Focus and "…" read x', () => {
      const root = rootOf(rig);
      const names = Array.from(root.children, (button): string | null => button.getAttribute('aria-label'));

      expect(root.getAttribute('aria-label')).toBe('Package x');
      expect(names).toContain('Focus x');
      expect(names).toContain('Actions for x');
    });

    it('WHEN its "…" is clicked THEN the menu opens for the package name', () => {
      const ellipsis = rig.toolbar.ellipsis();
      const target: MenuTarget = { kind: 'package', name: SCOPED };

      ellipsis?.click();

      expect(rig.deps.onMenu).toHaveBeenCalledWith(target, ellipsis);
    });
  });

  describe('GIVEN the x toolbar and then the label turns back to @org/x', () => {
    let before: Element;

    beforeEach((): void => {
      before = rootOf(rig);
      rig.labels.set(SCOPED, SCOPED);
      rig.toolbar.sync(SCOPED, null, NO_TASKS);
    });

    it('WHEN the same package is synced again THEN a new toolbar replaces the old one', () => {
      expect(rig.layer.children).toHaveLength(1);
      expect(rootOf(rig)).not.toBe(before);
    });

    it('WHEN the new toolbar is read THEN its name reads @org/x', () => {
      expect(rootOf(rig).getAttribute('aria-label')).toBe('Package @org/x');
    });
  });
});
