import { describe, expect, it } from 'vitest';

import { layoutCachesOf, storePositions } from './graph-layout-store.ts';
import type { PositionsPost } from '../common/graph-cache.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import {
  GRAPH_HASH_STUB,
  GRAPH_MODEL_STUB,
  GRAPH_PACKAGES_STUB,
  GRAPH_SHOWN_STUB,
  GRAPH_STATE_STUB,
  ROUTES_STUB
} from '../test/stubs/graph-model.stub.ts';
import { positionsOf } from '../test/utils/graph-session.spec.util.ts';
import { graphStateOf } from '../utils/graph-state.util.ts';

const FULL_POSITIONS = positionsOf(GRAPH_PACKAGES_STUB);

const postOf = (overrides: Partial<PositionsPost>): PositionsPost => {
  const post: PositionsPost = { hash: GRAPH_HASH_STUB, positions: FULL_POSITIONS, routes: {}, grouping: 'flat', ...overrides };

  return post;
};

describe('FEATURE: stored routes reach the next state', () => {
  it('GIVEN a post with routes stored under flat WHEN the state is built THEN routes carry them and folderRoutes is null', () => {
    const ports = graphPortsMock();

    storePositions(ports, '/ws', GRAPH_STATE_STUB, postOf({ routes: ROUTES_STUB, grouping: 'flat' }));
    const state = graphStateOf(GRAPH_MODEL_STUB, layoutCachesOf(ports, '/ws'), GRAPH_SHOWN_STUB);

    expect(state).toMatchObject({ positions: FULL_POSITIONS, routes: ROUTES_STUB, folderPositions: null, folderRoutes: null });
  });

  it('GIVEN a post with routes stored under folders WHEN the state is built THEN folderRoutes carry them and routes is null', () => {
    const ports = graphPortsMock();

    storePositions(ports, '/ws', GRAPH_STATE_STUB, postOf({ routes: ROUTES_STUB, grouping: 'folders' }));
    const state = graphStateOf(GRAPH_MODEL_STUB, layoutCachesOf(ports, '/ws'), GRAPH_SHOWN_STUB);

    expect(state).toMatchObject({ positions: null, routes: null, folderPositions: FULL_POSITIONS, folderRoutes: ROUTES_STUB });
  });
});
