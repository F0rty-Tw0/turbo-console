import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { centresOf } from './elk-centres.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

describe('FEATURE: centresOf', () => {
  it('GIVEN one laid-out child WHEN converted THEN its centre is its corner plus half its size', () => {
    const app: ElkNode = { id: 'app', x: 10, y: 20, width: 100, height: 32 };
    const laidOut: ElkNode = { id: 'root', children: [app], edges: [] };
    const centre: Position = { x: 60, y: 36 };

    const centres = centresOf(laidOut);

    expect(centres).toStrictEqual({ app: centre });
  });

  it('GIVEN two children of different sizes WHEN converted THEN each gets its own centre', () => {
    const app: ElkNode = { id: 'app', x: 0, y: 0, width: 100, height: 32 };
    const core: ElkNode = { id: 'core', x: 40, y: 80, width: 60, height: 20 };
    const laidOut: ElkNode = { id: 'root', children: [app, core] };
    const appCentre: Position = { x: 50, y: 16 };
    const coreCentre: Position = { x: 70, y: 90 };

    const centres = centresOf(laidOut);

    expect(centres).toStrictEqual({ app: appCentre, core: coreCentre });
  });

  it('GIVEN a child with no position or size WHEN converted THEN each missing number counts as 0', () => {
    const app: ElkNode = { id: 'app' };
    const laidOut: ElkNode = { id: 'root', children: [app] };
    const origin: Position = { x: 0, y: 0 };

    const centres = centresOf(laidOut);

    expect(centres).toStrictEqual({ app: origin });
  });

  it('GIVEN no children WHEN converted THEN there are no centres', () => {
    const laidOut: ElkNode = { id: 'root' };

    const centres = centresOf(laidOut);

    expect(centres).toStrictEqual({});
  });
});
