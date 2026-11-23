import type { Mock, Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphModuleLayout } from './graph-module-layout.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { LayoutScreen } from '../common/graph-layouts.type.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { LayoutResult, LayoutRunner } from '../common/layout.type.ts';
import type { ModuleCanvas } from '../common/module-canvas.type.ts';
import type { ModuleLayoutDeps } from '../common/module-mode.type.ts';
import type { ModuleMeasures } from '../common/module-scene.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { graphViewMock } from '../test/mocks/graph-view.mock.ts';
import { layoutRunsMock } from '../test/mocks/layout-runner.mock.ts';
import { moduleCanvasMock } from '../test/mocks/module-canvas.mock.ts';
import { MODULES_FOUND_STUB, MODULE_MEASURES_STUB } from '../test/stubs/module-scene.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';

const PAN: Position = { x: 10, y: 20 };

const VIEWPORT: Viewport = { zoom: 1.5, pan: PAN };

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB_VIEW: ModulesViewState = { ...FRESH_WEB, expanded: ['src'] };

const SAVED_PAN: Position = { x: 3, y: 4 };

const SAVED_CAMERA: Viewport = { zoom: 2, pan: SAVED_PAN };

const ELK_FAILED = new Error('elk failed');

const throwSize = (): NodeSize => {
  throw ELK_FAILED;
};

const THROWING_MEASURES: ModuleMeasures = { ...MODULE_MEASURES_STUB, sizeOf: throwSize };

const laidOut = async (hash: string): Promise<LayoutResult | null> => Promise.resolve(resultOf(hash, {}));

describe('FEATURE: GraphModuleLayout', () => {
  let view: Mocked<GraphView>;
  let canvas: Mocked<ModuleCanvas>;
  let runner: Mocked<LayoutRunner>;
  let arm: Mock<() => void>;
  let showGraph: Mock<LayoutScreen['showGraph']>;
  let onFailure: Mock<(error: unknown) => void>;
  let layout: GraphModuleLayout;

  const layoutWith = (run: LayoutRunner, measures: ModuleMeasures): GraphModuleLayout => {
    const frames = { arm };
    const deps: ModuleLayoutDeps = { view, runner: run, measures, frames, showGraph, onFailure };

    return new GraphModuleLayout(deps);
  };

  beforeEach(() => {
    const base = graphViewMock(VIEWPORT);

    canvas = moduleCanvasMock();
    view = { ...base, modules: canvas };
    runner = { run: vi.fn(laidOut) };
    arm = vi.fn();
    showGraph = vi.fn();
    onFailure = vi.fn();
    layout = layoutWith(runner, MODULE_MEASURES_STUB);
  });

  describe('GIVEN a first draw with a saved camera', () => {
    it('WHEN it is drawn THEN the saved camera is set and nothing fits', async () => {
      await layout.draw(MODULES_FOUND_STUB, { ...WEB_VIEW, camera: SAVED_CAMERA }, { kind: 'first' });

      expect(view.setViewport.mock.calls).toStrictEqual([[2, { x: 3, y: 4 }]]);
      expect([view.open.mock.calls.length, view.fit.mock.calls.length]).toStrictEqual([0, 0]);
    });
  });

  describe('GIVEN a first draw with no camera', () => {
    it('WHEN it is drawn THEN the view opens', async () => {
      await layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'first' });

      expect(view.open).toHaveBeenCalledOnce();
    });

    it('WHEN it is drawn THEN the frame clock is armed and the graph view shown without the fallback notice', async () => {
      await layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'first' });

      expect([arm.mock.calls.length, showGraph.mock.calls]).toStrictEqual([1, [[false]]]);
    });

    it('WHEN it is drawn THEN the runner key names the package, its expansion and its shown kinds', async () => {
      await layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'first' });

      expect(runner.run.mock.calls[0]?.[0]).toBe(
        'modules:web:{"expanded":["src"],"shown":{"types":true,"tests":false,"lazies":true}}'
      );
    });
  });

  describe('GIVEN a draw the fallback engine lays out', () => {
    it('WHEN it lands THEN the graph view is shown with the fallback notice', async () => {
      runner.run.mockResolvedValueOnce(resultOf('modules', {}, 'fallback'));

      await layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'keep' });

      expect(showGraph.mock.calls).toStrictEqual([[true]]);
    });
  });

  describe('GIVEN a toggle redraw', () => {
    it('WHEN it is drawn with keep THEN pan and zoom are left alone', async () => {
      await layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'keep' });

      expect([view.setViewport.mock.calls, view.fit.mock.calls, view.open.mock.calls]).toStrictEqual([[], [], []]);
    });

    it('WHEN it is drawn with fit THEN the view fits', async () => {
      await layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'fit' });

      expect(view.fit).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN src/lib at (100, 50) on screen before an expand and at (140, 80) after it', () => {
    it('WHEN it is drawn anchored on src/lib THEN the pan moves by (-40, -30)', async () => {
      canvas.renderedCentre.mockReturnValueOnce({ x: 100, y: 50 }).mockReturnValueOnce({ x: 140, y: 80 });

      await layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'anchor', id: 'dir:src/lib' });

      expect(view.setViewport.mock.calls).toStrictEqual([[VIEWPORT.zoom, { x: VIEWPORT.pan.x - 40, y: VIEWPORT.pan.y - 30 }]]);
    });
  });

  describe('GIVEN two draws where the first is overtaken', () => {
    it('WHEN the runner answers null for the first THEN only the second is shown', async () => {
      runner.run.mockResolvedValueOnce(null);

      await Promise.all([
        layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'keep' }),
        layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'keep' })
      ]);

      expect(canvas.show).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a draw in flight', () => {
    it('WHEN the layout is cleared before it lands THEN nothing is shown and no scene is kept', async () => {
      const drawing = layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'keep' });

      layout.clear();
      await drawing;

      expect([canvas.show.mock.calls.length, layout.scene()]).toStrictEqual([0, null]);
    });
  });

  describe('GIVEN a layout that throws while it is the draw asked for last', () => {
    it('WHEN it lands THEN the canvas is cleared and the failure reported once', async () => {
      runner.run.mockRejectedValueOnce(ELK_FAILED);

      await layout.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'first' });

      expect([canvas.clear.mock.calls.length, onFailure.mock.calls]).toStrictEqual([1, [[ELK_FAILED]]]);
    });

    it('WHEN measuring a card throws THEN the failure is reported and nothing is laid out', async () => {
      const measured = layoutWith(runner, THROWING_MEASURES);

      await measured.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'first' });

      expect([runner.run.mock.calls.length, onFailure.mock.calls]).toStrictEqual([0, [[ELK_FAILED]]]);
    });
  });

  describe('GIVEN a draw overtaken by a newer one', () => {
    it('WHEN the first layout then throws THEN nothing is cleared or reported', async () => {
      const runs = layoutRunsMock();
      const raced = layoutWith(runs.runner, MODULE_MEASURES_STUB);
      const first = raced.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'first' });

      void raced.draw(MODULES_FOUND_STUB, WEB_VIEW, { kind: 'keep' });
      await runs.fail(0, ELK_FAILED);
      await first;

      expect([canvas.clear.mock.calls.length, onFailure.mock.calls.length]).toStrictEqual([0, 0]);
    });
  });
});
