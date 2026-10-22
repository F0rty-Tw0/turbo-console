import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { nestedCentresOf } from './elk-centres.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

describe('FEATURE: nestedCentresOf', () => {
  it('GIVEN one laid-out child WHEN converted THEN its centre is its corner plus half its size', () => {
    const app: ElkNode = { id: 'app', x: 10, y: 20, width: 100, height: 32 };
    const laidOut: ElkNode = { id: 'root', children: [app], edges: [] };
    const centre: Position = { x: 60, y: 36 };

    const centres = nestedCentresOf(laidOut);

    expect(centres).toStrictEqual({ app: centre });
  });

  it('GIVEN two children of different sizes WHEN converted THEN each gets its own centre', () => {
    const app: ElkNode = { id: 'app', x: 0, y: 0, width: 100, height: 32 };
    const core: ElkNode = { id: 'core', x: 40, y: 80, width: 60, height: 20 };
    const laidOut: ElkNode = { id: 'root', children: [app, core] };
    const appCentre: Position = { x: 50, y: 16 };
    const coreCentre: Position = { x: 70, y: 90 };

    const centres = nestedCentresOf(laidOut);

    expect(centres).toStrictEqual({ app: appCentre, core: coreCentre });
  });

  it('GIVEN a child with no position or size WHEN converted THEN each missing number counts as 0', () => {
    const app: ElkNode = { id: 'app' };
    const laidOut: ElkNode = { id: 'root', children: [app] };
    const origin: Position = { x: 0, y: 0 };

    const centres = nestedCentresOf(laidOut);

    expect(centres).toStrictEqual({ app: origin });
  });

  it('GIVEN no children WHEN converted THEN there are no centres', () => {
    const laidOut: ElkNode = { id: 'root' };

    const centres = nestedCentresOf(laidOut);

    expect(centres).toStrictEqual({});
  });

  describe('GIVEN packages inside compounds', () => {
    it('WHEN converted THEN a child centre adds its compound offset and the compound has no entry', () => {
      const pkg: ElkNode = { id: 'p', x: 10, y: 20, width: 40, height: 30 };
      const apps: ElkNode = { id: '\u0001apps', x: 100, y: 200, children: [pkg] };
      const laidOut: ElkNode = { id: 'root', children: [apps] };
      const centre: Position = { x: 130, y: 235 };

      const centres = nestedCentresOf(laidOut);

      expect(centres).toStrictEqual({ p: centre });
    });

    it('WHEN two compounds are converted THEN each package uses its own compound offset', () => {
      const first: ElkNode = { id: 'a', x: 0, y: 0, width: 10, height: 10 };
      const second: ElkNode = { id: 'b', x: 0, y: 0, width: 10, height: 10 };
      const apps: ElkNode = { id: '\u0001apps', x: 100, y: 0, children: [first] };
      const libs: ElkNode = { id: '\u0001libs', x: 300, y: 50, children: [second] };
      const laidOut: ElkNode = { id: 'root', children: [apps, libs] };

      const aCentre: Position = { x: 105, y: 5 };
      const bCentre: Position = { x: 305, y: 55 };

      const centres = nestedCentresOf(laidOut);

      expect(centres).toStrictEqual({ a: aCentre, b: bCentre });
    });

    it('WHEN a compound has no x or y THEN its offset counts as 0', () => {
      const pkg: ElkNode = { id: 'p', x: 10, y: 20, width: 40, height: 30 };
      const apps: ElkNode = { id: '\u0001apps', children: [pkg] };
      const laidOut: ElkNode = { id: 'root', children: [apps] };

      const centre: Position = { x: 30, y: 35 };

      const centres = nestedCentresOf(laidOut);

      expect(centres).toStrictEqual({ p: centre });
    });

    it('WHEN a package is named __proto__ THEN it is an own key', () => {
      const pkg: ElkNode = { id: '__proto__', x: 0, y: 0, width: 10, height: 10 };
      const apps: ElkNode = { id: '\u0001apps', children: [pkg] };
      const laidOut: ElkNode = { id: 'root', children: [apps] };

      const centres = nestedCentresOf(laidOut);

      expect(Object.hasOwn(centres, '__proto__')).toBe(true);
    });
  });
});
