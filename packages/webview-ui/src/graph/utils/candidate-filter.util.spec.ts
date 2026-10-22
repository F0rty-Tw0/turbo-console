import { describe, expect, it } from 'vitest';

import { filteredCandidatesOf, firstCandidateOf, litCandidatesOf } from './candidate-filter.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { TraceCandidate, TraceCandidates } from '../common/trace.type.ts';

const candidateOf = (label: string): TraceCandidate => {
  const [name = '', steps = ''] = label.split(':');
  const candidate: TraceCandidate = { name, steps: Number(steps) };

  return candidate;
};

const candidatesOf = (forward: string[], backward: string[], none: string[]): TraceCandidates => {
  const forwardCandidates = forward.map(candidateOf);
  const backwardCandidates = backward.map(candidateOf);
  const candidates: TraceCandidates = { forward: forwardCandidates, backward: backwardCandidates, none };

  return candidates;
};

const labelsOf = (candidates: TraceCandidate[]): string[] => candidates.map((candidate) => `${candidate.name}:${candidate.steps}`);

const packageOf = (name: string, path: string): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return pkg;
};

const PACKAGES: GraphPackage[] = [
  packageOf('web', 'apps/web'),
  packageOf('ui', 'packages/ui'),
  packageOf('core', 'packages/core'),
  packageOf('forms', 'packages/forms'),
  packageOf('app', 'apps/app'),
  packageOf('shell', 'apps/shell'),
  packageOf('docs', 'apps/docs'),
  packageOf('docs-util', 'packages/docs-util'),
  packageOf('lonely', '')
];

const R1 = candidatesOf(['forms:1', 'ui:1', 'core:2'], ['app:1', 'shell:2'], ['docs', 'docs-util', 'lonely']);
const GHOST = candidatesOf(['ghost:1'], [], []);
const PROTO = candidatesOf(['__proto__:1'], [], []);
const PROTO_PACKAGES = [packageOf('__proto__', 'packages/proto')];
const EMPTY = candidatesOf([], [], []);

describe('FEATURE: filteredCandidatesOf', () => {
  describe('GIVEN candidates and a filter', () => {
    it.each([
      {
        title: 'empty filter keeps all',
        candidates: R1,
        packages: PACKAGES,
        filter: '',
        forward: ['forms:1', 'ui:1', 'core:2'],
        backward: ['app:1', 'shell:2'],
        none: ['docs', 'docs-util', 'lonely']
      },
      {
        title: 'name or path substring',
        candidates: R1,
        packages: PACKAGES,
        filter: 'u',
        forward: ['ui:1'],
        backward: [],
        none: ['docs-util']
      },
      {
        title: 'path match counts',
        candidates: R1,
        packages: PACKAGES,
        filter: 'app',
        forward: [],
        backward: ['app:1', 'shell:2'],
        none: ['docs']
      },
      { title: 'case-insensitive', candidates: R1, packages: PACKAGES, filter: 'UI', forward: ['ui:1'], backward: [], none: [] },
      { title: 'nothing matches', candidates: R1, packages: PACKAGES, filter: 'zzz', forward: [], backward: [], none: [] },
      { title: 'nothing is trimmed', candidates: R1, packages: PACKAGES, filter: ' ', forward: [], backward: [], none: [] },
      {
        title: 'no record, empty filter: kept',
        candidates: GHOST,
        packages: [],
        filter: '',
        forward: ['ghost:1'],
        backward: [],
        none: []
      },
      { title: 'no record, filter: dropped', candidates: GHOST, packages: [], filter: 'g', forward: [], backward: [], none: [] },
      {
        title: '__proto__ kept by path',
        candidates: PROTO,
        packages: PROTO_PACKAGES,
        filter: 'proto',
        forward: ['__proto__:1'],
        backward: [],
        none: []
      },
      { title: '__proto__ dropped', candidates: PROTO, packages: PROTO_PACKAGES, filter: 'ctor', forward: [], backward: [], none: [] }
    ])('WHEN $title THEN the kept candidates are exact and in order', (row) => {
      const filtered = filteredCandidatesOf(row.candidates, row.packages, row.filter);

      expect(labelsOf(filtered.forward)).toStrictEqual(row.forward);
      expect(labelsOf(filtered.backward)).toStrictEqual(row.backward);
      expect(filtered.none).toStrictEqual(row.none);
    });
  });
});

describe('FEATURE: firstCandidateOf', () => {
  it.each([
    ['forward has one', R1, 'forms'],
    ['only backward has one', candidatesOf([], ['app:1'], []), 'app'],
    ['only none has one', candidatesOf([], [], ['docs']), 'docs'],
    ['nothing at all', EMPTY, null]
  ])('GIVEN %s WHEN the first is asked THEN the name or null is exact', (_title, candidates, first) => {
    const name = firstCandidateOf(candidates);

    expect(name).toBe(first);
  });
});

describe('FEATURE: litCandidatesOf', () => {
  it.each([
    ['forward and backward', R1, ['app', 'core', 'forms', 'shell', 'ui']],
    ['only none', candidatesOf([], [], ['docs']), []],
    ['nothing at all', EMPTY, []]
  ])('GIVEN %s WHEN the lit names are asked THEN they are exact', (_title, candidates, lit) => {
    const names = litCandidatesOf(candidates);
    const listed = [...names];
    const sorted = listed.sort();

    expect(sorted).toStrictEqual(lit);
  });
});
