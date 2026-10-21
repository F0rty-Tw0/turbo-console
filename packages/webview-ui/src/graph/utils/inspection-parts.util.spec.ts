import { describe, expect, it } from 'vitest';

import { candidatesFor, litOf, selectedOf, traceFor } from './inspection-parts.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { TraceCandidate, TraceCandidates, TraceResult } from '../common/trace.type.ts';
import { link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';

const E: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'ui', target: 'core' }
];

const ALL: ReadonlySet<string> = new Set(['web', 'ui', 'core', 'docs']);

const infoOf = (name: string): GraphPackage => {
  const info: GraphPackage = { name, path: `packages/${name}`, tags: [], taskCount: 0 };

  return info;
};

const INFOS: GraphPackage[] = [infoOf('web'), infoOf('ui'), infoOf('core'), infoOf('docs')];

const WEB_TRACE: TraceResult = { direction: 'forward', path: ['web', 'ui', 'core'], edges: E };

const WEB_FORWARD: TraceCandidate[] = [
  { name: 'ui', steps: 1 },
  { name: 'core', steps: 2 }
];

const WEB_CANDIDATES: TraceCandidates = { forward: WEB_FORWARD, backward: [], none: ['docs'] };

describe('FEATURE: selectedOf', () => {
  describe('GIVEN an inspection', () => {
    it.each([
      { title: 'nothing is inspected', inspection: NO_INSPECTION, expected: null },
      { title: 'a package is inspected', inspection: pkg('web'), expected: 'web' },
      { title: 'a link is inspected', inspection: link('web', 'ui'), expected: null },
      { title: 'an end is being picked', inspection: pick('web', false), expected: null },
      { title: 'a trace shows', inspection: trace('web', 'ui'), expected: null }
    ])('WHEN $title THEN the selected name is $expected', ({ inspection, expected }) => {
      const name = selectedOf(inspection);

      expect(name).toBe(expected);
    });
  });
});

describe('FEATURE: traceFor', () => {
  describe('GIVEN the drawn edges', () => {
    it('WHEN a trace shows THEN its path is walked', () => {
      const result = traceFor(trace('web', 'core'), E);

      expect(result).toStrictEqual(WEB_TRACE);
    });

    it('WHEN an end is being picked THEN there is no path', () => {
      const result = traceFor(pick('web', false), E);

      expect(result).toBeNull();
    });
  });
});

describe('FEATURE: candidatesFor', () => {
  describe('GIVEN the drawn edges and the visible packages', () => {
    it('WHEN an end is being picked THEN the candidates are found from its start', () => {
      const result = candidatesFor(pick('web', false), E, ALL);

      expect(result).toStrictEqual(WEB_CANDIDATES);
    });

    it('WHEN a trace shows THEN there are no candidates', () => {
      const result = candidatesFor(trace('web', 'core'), E, ALL);

      expect(result).toBeNull();
    });
  });
});

describe('FEATURE: litOf', () => {
  describe('GIVEN the package records', () => {
    it.each([
      { title: 'not picking', candidates: null, filter: '', expected: [] },
      { title: 'picking with an empty filter', candidates: WEB_CANDIDATES, filter: '', expected: ['ui', 'core'] },
      { title: 'picking with a filter', candidates: WEB_CANDIDATES, filter: 'co', expected: ['core'] },
      { title: 'picking with a filter matching only an unrelated package', candidates: WEB_CANDIDATES, filter: 'docs', expected: [] }
    ])('WHEN $title THEN the lit names are exact', ({ candidates, filter, expected }) => {
      const lit = litOf(candidates, INFOS, filter);

      expect([...lit]).toStrictEqual(expected);
    });
  });
});
