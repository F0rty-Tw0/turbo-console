import { describe, expect, it, vi } from 'vitest';

import { postLayout } from './layout-post.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { CENTRES_STUB, ROUTES_STUB } from '../test/stubs/layout.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';

const bridgeOf = (): Bridge => {
  const bridge: Bridge = {
    ready: vi.fn(),
    post: vi.fn<Bridge['post']>(),
    onMessage: vi.fn(),
    savedState: vi.fn(),
    saveState: vi.fn()
  };

  return bridge;
};

describe('FEATURE: postLayout', () => {
  it('GIVEN an elk result with routes WHEN posted THEN the positions post carries them', () => {
    const bridge = bridgeOf();
    const plain = resultOf('h1', CENTRES_STUB);
    const routed: LayoutResult = { ...plain, routes: ROUTES_STUB };

    postLayout(bridge, routed, 'flat');

    expect(vi.mocked(bridge.post).mock.calls[0]?.[0]).toStrictEqual({
      type: 'positions',
      hash: 'h1',
      positions: CENTRES_STUB,
      routes: ROUTES_STUB,
      grouping: 'flat'
    });
  });
});
