import { describe, expect, it } from 'vitest';

import { refreshedDrawn } from './graph-package-draw.ts';
import type { GraphPackage, GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import { BARE_HIDDEN_STUB, BARE_SHOWN_STUB } from '../test/stubs/scope-labels.stub.ts';
import { drawnGraphOf } from '../utils/drawn-graph.util.ts';

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
