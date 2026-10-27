import { describe, expect, it } from 'vitest';

import { EDGE_WIDTH, HIGHLIGHTED_EDGE_WIDTH, NODE_BORDER_PX, SELECTED_BORDER_PX, SELECTED_EDGE_WIDTH } from './graph.const.ts';

describe('FEATURE: graph constants', () => {
  it.each([
    ['the plain edge width', EDGE_WIDTH, 0.75],
    ['the highlighted edge width', HIGHLIGHTED_EDGE_WIDTH, 1.25],
    ['the selected edge width', SELECTED_EDGE_WIDTH, 1.5],
    ['the plain node border', NODE_BORDER_PX, 1],
    ['the selected node border', SELECTED_BORDER_PX, 1.5]
  ])('GIVEN %s WHEN it is read THEN it is the spec value', (_label, value, expected) => {
    expect(value).toBe(expected);
  });
});
