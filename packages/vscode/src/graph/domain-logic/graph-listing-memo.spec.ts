import type { WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { GraphListingMemo } from './graph-listing-memo.ts';
import { GRAPH_MODEL_STUB } from '../test/stubs/graph-model.stub.ts';
import { graphListingOf } from '../utils/graph-tasks.util.ts';

const NEXT_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB };

describe('FEATURE: graph listing memo', () => {
  it('GIVEN a model WHEN its listing is read THEN it equals graphListingOf of it', () => {
    const memo = new GraphListingMemo();

    expect(memo.of(GRAPH_MODEL_STUB)).toStrictEqual(graphListingOf(GRAPH_MODEL_STUB));
  });

  it('GIVEN a listing read WHEN the same model is read again THEN the same listing object comes back', () => {
    const memo = new GraphListingMemo();
    const first = memo.of(GRAPH_MODEL_STUB);

    expect(memo.of(GRAPH_MODEL_STUB)).toBe(first);
  });

  it('GIVEN a listing read WHEN a replaced model is read THEN a new listing is built', () => {
    const memo = new GraphListingMemo();
    const first = memo.of(GRAPH_MODEL_STUB);

    expect(memo.of(NEXT_MODEL)).not.toBe(first);
  });
});
