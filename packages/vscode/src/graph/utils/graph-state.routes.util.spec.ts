import type { Position, Positions, Routes } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf } from './graph-state.util.ts';
import type { GraphLayoutCacheEntry, GraphLayoutCaches } from '../common/graph-cache.type.ts';
import {
  GRAPH_HASH_STUB,
  GRAPH_MODEL_STUB,
  GRAPH_SHOWN_STUB,
  NO_LAYOUT_CACHES_STUB,
  POSITIONS_STUB,
  ROUTES_STUB
} from '../test/stubs/graph-model.stub.ts';

type Layout = {
  readonly positions: Positions | null;
  readonly routes: Routes | null;
  readonly folderPositions: Positions | null;
  readonly folderRoutes: Routes | null;
};

type PairCase = {
  readonly label: string;
  readonly caches: GraphLayoutCaches;
  readonly expected: Layout;
};

const FOLDER_ROUTES: Routes = {};
const GHOST_POINT: Position = { x: 1, y: 1 };
const GHOST_POSITIONS: Positions = { ...POSITIONS_STUB, ghost: GHOST_POINT };
const FLAT: GraphLayoutCacheEntry = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB, routes: ROUTES_STUB };
const FOLDERS: GraphLayoutCacheEntry = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB, routes: FOLDER_ROUTES };
const STALE_FLAT: GraphLayoutCacheEntry = { ...FLAT, hash: 'ffffffff' };
const STALE_FOLDERS: GraphLayoutCacheEntry = { ...FOLDERS, hash: 'ffffffff' };
const GHOSTED: GraphLayoutCacheEntry = { ...FLAT, positions: GHOST_POSITIONS };

const FLAT_ONLY: GraphLayoutCaches = { flat: FLAT, folders: null };
const FOLDERS_ONLY: GraphLayoutCaches = { flat: null, folders: FOLDERS };
const BOTH: GraphLayoutCaches = { flat: FLAT, folders: FOLDERS };
const BOTH_STALE: GraphLayoutCaches = { flat: STALE_FLAT, folders: STALE_FOLDERS };
const FLAT_GHOSTED: GraphLayoutCaches = { flat: GHOSTED, folders: FOLDERS };

const NONE: Layout = { positions: null, routes: null, folderPositions: null, folderRoutes: null };
const FLAT_PAIR: Layout = { ...NONE, positions: POSITIONS_STUB, routes: ROUTES_STUB };
const FOLDERS_PAIR: Layout = { ...NONE, folderPositions: POSITIONS_STUB, folderRoutes: FOLDER_ROUTES };
const BOTH_PAIRS: Layout = {
  positions: POSITIONS_STUB,
  routes: ROUTES_STUB,
  folderPositions: POSITIONS_STUB,
  folderRoutes: FOLDER_ROUTES
};

const PAIR_CASES: PairCase[] = [
  { label: 'a flat entry only', caches: FLAT_ONLY, expected: FLAT_PAIR },
  { label: 'a folders entry only', caches: FOLDERS_ONLY, expected: FOLDERS_PAIR },
  { label: 'both entries', caches: BOTH, expected: BOTH_PAIRS },
  { label: 'a stale hash in both entries', caches: BOTH_STALE, expected: NONE },
  { label: 'a flat entry whose positions do not cover the packages', caches: FLAT_GHOSTED, expected: FOLDERS_PAIR }
];

describe('FEATURE: ready routes of a graph state', () => {
  it('GIVEN no cache entry WHEN the state is built THEN all four layout fields are null', () => {
    const state = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

    expect(state).toMatchObject(NONE);
  });

  it.each(PAIR_CASES)(
    'GIVEN $label WHEN the state is built THEN each routes field comes from its own entry',
    ({ caches, expected }) => {
      const state = graphStateOf(GRAPH_MODEL_STUB, caches, GRAPH_SHOWN_STUB);

      expect(state).toMatchObject(expected);
    }
  );
});
