import { describe, expect, it } from 'vitest';

import { recheckInspection } from './inspection-recheck.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';

const E: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'ui', target: 'core' }
];

const PROTO_EDGES: GraphEdge[] = [{ source: '__proto__', target: 'constructor' }];

const NONE: Inspection = NO_INSPECTION;

const PKG: Inspection = { kind: 'package', name: 'web' };

const LINK: Inspection = { kind: 'link', source: 'web', target: 'ui' };

const PICKING: Inspection = { kind: 'picking', start: 'web', isNudged: false };

const NUDGED: Inspection = { kind: 'picking', start: 'web', isNudged: true };

const TRACE: Inspection = { kind: 'trace', start: 'web', end: 'core' };

const PROTO_LINK: Inspection = { kind: 'link', source: '__proto__', target: 'constructor' };

const PROTO_TRACE: Inspection = { kind: 'trace', start: '__proto__', end: 'constructor' };

const PROTO_PKG: Inspection = { kind: 'package', name: '__proto__' };

const ALL_THREE = new Set(['web', 'ui', 'core']);

describe('FEATURE: recheckInspection', () => {
  describe('GIVEN a filter change', () => {
    it.each([
      { title: 'none stays', current: NONE, visible: new Set<string>(), edges: E, expected: NONE },
      { title: 'a visible package stays', current: PKG, visible: ALL_THREE, edges: E, expected: PKG },
      { title: 'a hidden package goes', current: PKG, visible: new Set(['ui', 'core']), edges: E, expected: NONE },
      { title: 'a link between visible ends stays', current: LINK, visible: new Set(['web', 'ui']), edges: E, expected: LINK },
      { title: 'a link with a hidden target goes', current: LINK, visible: new Set(['web']), edges: E, expected: NONE },
      { title: 'a link with a hidden source goes', current: LINK, visible: new Set(['ui']), edges: E, expected: NONE },
      {
        title: 'a link that runs the other way goes',
        current: { kind: 'link', source: 'ui', target: 'web' } satisfies Inspection,
        visible: new Set(['web', 'ui']),
        edges: E,
        expected: NONE
      },
      { title: 'a link whose edge is gone goes', current: LINK, visible: new Set(['web', 'ui']), edges: [], expected: NONE },
      { title: 'picking with a visible start stays', current: PICKING, visible: new Set(['web']), edges: E, expected: PICKING },
      { title: 'picking with a hidden start goes', current: PICKING, visible: new Set(['ui', 'core']), edges: E, expected: NONE },
      { title: 'nudged picking keeps its nudge', current: NUDGED, visible: new Set(['web']), edges: E, expected: NUDGED },
      {
        title: 'nudged picking with a hidden start goes',
        current: NUDGED,
        visible: new Set(['ui', 'core']),
        edges: E,
        expected: NONE
      },
      { title: 'a trace with every package visible stays', current: TRACE, visible: ALL_THREE, edges: E, expected: TRACE },
      { title: 'a trace with a hidden middle stays', current: TRACE, visible: new Set(['web', 'core']), edges: E, expected: TRACE },
      {
        title: 'a trace with a hidden end falls to its start',
        current: TRACE,
        visible: new Set(['web', 'ui']),
        edges: E,
        expected: PKG
      },
      { title: 'a trace with a hidden start goes', current: TRACE, visible: new Set(['ui', 'core']), edges: E, expected: NONE },
      { title: 'a trace with nothing visible goes', current: TRACE, visible: new Set<string>(), edges: E, expected: NONE },
      {
        title: 'a __proto__ link stays',
        current: PROTO_LINK,
        visible: new Set(['__proto__', 'constructor']),
        edges: PROTO_EDGES,
        expected: PROTO_LINK
      },
      {
        title: 'a __proto__ trace with a hidden end falls to its start',
        current: PROTO_TRACE,
        visible: new Set(['__proto__']),
        edges: [],
        expected: PROTO_PKG
      },
      { title: 'a trace needs no edges', current: TRACE, visible: ALL_THREE, edges: [], expected: TRACE }
    ])('WHEN $title THEN the result is exact', ({ current, visible, edges, expected }) => {
      const next = recheckInspection(current, visible, edges);

      expect(next).toStrictEqual(expected);
    });
  });
});
