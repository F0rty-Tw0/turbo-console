import { describe, expect, it } from 'vitest';

import {
  candidateTitleOf,
  dependenciesTitleOf,
  dependentsTitleOf,
  entryLabelOf,
  entryRowTextOf,
  explainLabelOf,
  focusFaceOf,
  hintTextOf,
  linkTitleOf,
  manifestFileOf,
  missingTextOf,
  openAtLabelOf,
  openDetailsLabelOf,
  openManifestLabelOf,
  pathTextOf,
  pickingTitleOf,
  readingTextOf,
  stepsTextOf,
  traceSummaryOf,
  unreadableTextOf
} from './details-text.util.ts';
import type { ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import type { CandidateKey } from '../common/details.type.ts';
import type { TraceDirection } from '../common/trace.type.ts';

const ENTRY: ManifestEntry = { field: 'devDependencies', key: 'ui', spec: '^1.0.0', line: 9, context: {} };

const FILE = 'apps/web/package.json';

type SummaryRow = {
  readonly title: string;
  readonly direction: TraceDirection;
  readonly count: number;
  readonly expected: string;
};

const SUMMARY_ROWS: SummaryRow[] = [
  { title: 'forward', direction: 'forward', count: 3, expected: '3 packages on the shortest path.' },
  { title: 'backward', direction: 'backward', count: 2, expected: '2 packages on the shortest path.' },
  { title: 'none', direction: 'none', count: 0, expected: 'No dependency path between web and ui.' }
];

const CANDIDATE_ROWS: [CandidateKey, number, string][] = [
  ['forward', 2, 'docs depends on (2)'],
  ['backward', 0, 'Depends on docs (0)'],
  ['none', 2, 'No dependency path (2)']
];

describe('FEATURE: details text', () => {
  describe('GIVEN a package', () => {
    it.each([
      ['', '(root)'],
      ['apps/web', 'apps/web']
    ])('WHEN the path %j is shown THEN it reads %s', (path, expected) => {
      const text = pathTextOf(path);

      expect(text).toBe(expected);
    });

    it.each([
      ['', 'package.json'],
      ['apps/web', 'apps/web/package.json']
    ])('WHEN the manifest of path %j is named THEN it is %s', (path, expected) => {
      const file = manifestFileOf(path);

      expect(file).toBe(expected);
    });

    it.each([
      [0, 'View Package Details · 0 tasks'],
      [1, 'View Package Details · 1 task'],
      [12, 'View Package Details · 12 tasks']
    ])('WHEN it has %i tasks THEN the open label is %s', (count, expected) => {
      const label = openDetailsLabelOf(count);

      expect(label).toBe(expected);
    });

    it('WHEN it has 3 dependencies THEN their title counts them', () => {
      const title = dependenciesTitleOf(3);

      expect(title).toBe('Direct dependencies (3)');
    });

    it('WHEN it has no dependents THEN their title counts 0', () => {
      const title = dependentsTitleOf(0);

      expect(title).toBe('Direct dependents (0)');
    });
  });

  describe('GIVEN a link', () => {
    it.each([
      ['web', '@acme/ui', 'web → @acme/ui'],
      ['__proto__', 'constructor', '__proto__ → constructor']
    ])('WHEN the link %s to %s is titled THEN it reads %s', (source, target, expected) => {
      const title = linkTitleOf(source, target);

      expect(title).toBe(expected);
    });

    it('WHEN its explain label is built THEN it names both ends in order', () => {
      const label = explainLabelOf('web', 'ui');

      expect(label).toBe('Explain web → ui');
    });
  });

  describe('GIVEN the manifest apps/web/package.json', () => {
    it('WHEN it is being read THEN the text names it', () => {
      const text = readingTextOf(FILE);

      expect(text).toBe('Reading apps/web/package.json…');
    });

    it('WHEN it has no entry for the target THEN the text names both', () => {
      const text = missingTextOf(FILE, '@acme/ui');

      expect(text).toBe('apps/web/package.json has no entry naming @acme/ui.');
    });

    it('WHEN it could not be read THEN the text names it', () => {
      const text = unreadableTextOf(FILE);

      expect(text).toBe("Couldn't read apps/web/package.json.");
    });
  });

  describe('GIVEN a manifest entry on 0-based line 9', () => {
    it('WHEN its label is built THEN it names the field and the 1-based line', () => {
      const entry: ManifestEntry = { ...ENTRY, field: 'dependencies' };

      const label = entryLabelOf(entry);

      expect(label).toBe('dependencies, line 10');
    });

    it('WHEN its row text is built THEN the key and spec are quoted', () => {
      const text = entryRowTextOf(ENTRY);

      expect(text).toBe('"ui": "^1.0.0"');
    });

    it('WHEN its open button text is built THEN it names the 1-based line', () => {
      const label = openAtLabelOf(9);

      expect(label).toBe('Open at line 10');
    });

    it('WHEN its open button name is built THEN it names the line, field and key', () => {
      const label = openManifestLabelOf(ENTRY);

      expect(label).toBe('Open package.json at line 10 (devDependencies: ui)');
    });
  });

  describe('GIVEN a trace from web', () => {
    it('WHEN its end is being picked THEN the title names the start', () => {
      const title = pickingTitleOf('web');

      expect(title).toBe('Trace from web');
    });

    it.each(SUMMARY_ROWS)(
      'WHEN the $title trace to ui is summed up THEN the lead counts the path, or names both ends when there is none',
      (row) => {
        const text = traceSummaryOf('web', 'ui', row.direction, row.count);

        expect(text).toBe(row.expected);
      }
    );
  });

  describe('GIVEN the candidate groups of a trace from docs', () => {
    it.each(CANDIDATE_ROWS)('WHEN the %s group of %i is titled THEN it reads %s', (key, total, expected) => {
      const title = candidateTitleOf(key, 'docs', total);

      expect(title).toBe(expected);
    });

    it.each([
      [1, '1 link'],
      [2, '2 links']
    ])('WHEN a candidate is %i steps away THEN its steps read %s', (steps, expected) => {
      const text = stepsTextOf(steps);

      expect(text).toBe(expected);
    });
  });

  describe('GIVEN the canvas hint while picking from docs', () => {
    it('WHEN no link was tapped THEN it names the start', () => {
      const text = hintTextOf('docs', false);

      expect(text).toBe('Pick the end of the trace from docs');
    });

    it('WHEN a link was tapped THEN it nudges to pick a package', () => {
      const text = hintTextOf('docs', true);

      expect(text).toBe('Pick a package to end the trace');
    });
  });

  describe('GIVEN a package Focus button', () => {
    it.each([
      { title: 'focused', isFocused: true, icon: 'close', text: 'Clear focus' },
      { title: 'unfocused', isFocused: false, icon: 'target', text: 'Focus' }
    ])('WHEN it is $title THEN it draws $icon and reads $text', ({ isFocused, icon, text }) => {
      const face = focusFaceOf(isFocused);

      expect(face).toStrictEqual({ icon, text });
    });
  });
});
