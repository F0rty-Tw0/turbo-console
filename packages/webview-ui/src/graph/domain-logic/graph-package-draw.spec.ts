import type { Mocked } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import { refreshedDrawn, restoreAfterDraw } from './graph-package-draw.ts';
import type { GraphPackage, GraphReady, Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { DrawnGraph, GraphView, Viewport } from '../common/graph-page.type.ts';
import { graphViewMock } from '../test/mocks/graph-view.mock.ts';
import { BARE_HIDDEN_STUB, BARE_SHOWN_STUB } from '../test/stubs/scope-labels.stub.ts';
import { drawnGraphOf } from '../utils/drawn-graph.util.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';

const recountOf = (pkg: GraphPackage): GraphPackage => {
  const recounted: GraphPackage = { ...pkg, taskCount: pkg.taskCount + 1 };

  return recounted;
};

/** `BARE_SHOWN_STUB` again, every package with one task more. */
const RECOUNTED: GraphReady = { ...BARE_SHOWN_STUB, packages: BARE_SHOWN_STUB.packages.map(recountOf) };

describe('FEATURE: refreshedDrawn', () => {
  describe('GIVEN h1 drawn with scopes shown', () => {
    const shown: DrawnGraph = drawnGraphOf(BARE_SHOWN_STUB);

    describe('WHEN h1 arrives again with scopes hidden', () => {
      it('THEN the graph changed: scopes are hidden and the labels are the bare names', () => {
        const refreshed = refreshedDrawn(shown, BARE_HIDDEN_STUB);

        expect([refreshed === shown, refreshed.scopeShown, [...refreshed.labels]]).toStrictEqual([
          false,
          false,
          [
            ['web', 'bare-web'],
            ['ui', 'bare-ui'],
            ['core', 'bare-core']
          ]
        ]);
      });

      it('THEN the hash, names and edges stay', () => {
        const { hash, packages, edges } = refreshedDrawn(shown, BARE_HIDDEN_STUB);

        expect([hash, packages, edges]).toStrictEqual([shown.hash, shown.packages, shown.edges]);
      });
    });

    it('WHEN h1 arrives again with new task counts only THEN the shown labels are kept', () => {
      const refreshed = refreshedDrawn(shown, RECOUNTED);

      expect(refreshed.labels).toBe(shown.labels);
    });

    it('WHEN h1 arrives again unchanged THEN the shown graph itself is kept', () => {
      const refreshed = refreshedDrawn(shown, BARE_SHOWN_STUB);

      expect(refreshed).toBe(shown);
    });
  });
});

describe('FEATURE: restoreAfterDraw camera', () => {
  type CameraCall = 'fit' | 'open' | 'setViewport';

  const CAMERA_CALLS: CameraCall[] = ['fit', 'open', 'setViewport'];
  const ORIGIN: Position = { x: 0, y: 0 };
  const CAMERA: Viewport = { zoom: 1, pan: ORIGIN };
  const drawn = drawnGraphOf(BARE_SHOWN_STUB);
  const OPENING = freshViewStateOf(drawn.hash);
  const MOVED: GraphViewState = { ...OPENING, zoom: 1.5 };
  const FITTED: GraphViewState = { ...OPENING, fitted: true };

  const restoredViewOf = (saved: GraphViewState | null): Mocked<GraphView> => {
    const view = graphViewMock(CAMERA);
    const frames = { arm: vi.fn(), receivedAt: vi.fn((): number => 0) };
    const inspection = { mount: vi.fn(), restore: vi.fn() };
    const filtering = { restore: vi.fn((): ReadonlySet<string> => new Set()), inspection };

    restoreAfterDraw({ drawn, opening: OPENING, frames, filtering, view }, saved);

    return view;
  };

  it.each([
    ['no saved camera', 'open', null],
    ['a save for another hash', 'open', freshViewStateOf('h0')],
    ['a fitted save for this hash', 'fit', FITTED],
    ['a moved save for this hash', 'setViewport', MOVED],
    ['the opening state itself (large graph, no grouping choice)', 'open', OPENING]
  ] as const)('GIVEN %s WHEN the first draw restores THEN the camera calls %s only', (_name, called, saved) => {
    const view = restoredViewOf(saved);
    const others = CAMERA_CALLS.filter((name: CameraCall): boolean => name !== called);

    expect(view[called]).toHaveBeenCalledOnce();
    others.forEach((name: CameraCall): void => expect(view[name]).not.toHaveBeenCalled());
  });
});
