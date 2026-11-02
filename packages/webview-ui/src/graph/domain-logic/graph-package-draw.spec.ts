import { describe, expect, it } from 'vitest';

import { refreshedDrawn } from './graph-package-draw.ts';
import type { GraphPackage, GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import { STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { drawnGraphOf } from '../utils/drawn-graph.util.ts';

const bareOf = (pkg: GraphPackage): GraphPackage => {
  const bare: GraphPackage = { ...pkg, bareName: `bare-${pkg.name}` };

  return bare;
};

const BARE: GraphPackage[] = STATE_STUB.packages.map(bareOf);

const SHOWN: GraphReady = { ...STATE_STUB, packages: BARE };

const HIDDEN: GraphReady = { ...SHOWN, scopeShown: false };

describe('FEATURE: refreshedDrawn', () => {
  describe('GIVEN h1 drawn with scopes shown', () => {
    const shown: DrawnGraph = drawnGraphOf(SHOWN);

    describe('WHEN h1 arrives again with scopes hidden', () => {
      it('THEN the graph changed: scopes are hidden and the labels are the bare names', () => {
        const refreshed = refreshedDrawn(shown, HIDDEN);

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
        const { hash, packages, edges } = refreshedDrawn(shown, HIDDEN);

        expect([hash, packages, edges]).toStrictEqual([shown.hash, shown.packages, shown.edges]);
      });
    });

    it('WHEN h1 arrives again unchanged THEN the shown graph itself is kept', () => {
      const refreshed = refreshedDrawn(shown, SHOWN);

      expect(refreshed).toBe(shown);
    });
  });
});
