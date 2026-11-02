import { describe, expect, it } from 'vitest';

import { labelsOf, packageLabelOf } from './package-label.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';

const SCOPED: GraphPackage = { name: '@org/x', bareName: 'x', path: 'packages/x', tags: [], taskCount: 0 };

const PLAIN: GraphPackage = { ...SCOPED, name: 'app', bareName: 'app', path: 'packages/app' };

describe('FEATURE: packageLabelOf', () => {
  describe('GIVEN a scoped package', () => {
    it('WHEN scopes are shown THEN the label is the name', () => {
      const label = packageLabelOf(SCOPED, true);

      expect(label).toBe('@org/x');
    });

    it('WHEN scopes are hidden THEN the label is the bare name', () => {
      const label = packageLabelOf(SCOPED, false);

      expect(label).toBe('x');
    });
  });

  describe('GIVEN an unscoped package', () => {
    it('WHEN labelled both ways THEN both labels match', () => {
      const labels = [packageLabelOf(PLAIN, true), packageLabelOf(PLAIN, false)];

      expect(labels).toStrictEqual(['app', 'app']);
    });
  });

  describe('GIVEN a name the host cleaned (a zero-width U+200B)', () => {
    it('WHEN scopes are shown THEN the label keeps the raw name, as the webview cannot clean text', () => {
      const odd: GraphPackage = { ...SCOPED, name: `@org/x${String.fromCodePoint(0x200b)}` };

      const label = packageLabelOf(odd, true);

      expect(label).toBe(odd.name);
    });
  });
});

describe('FEATURE: labelsOf', () => {
  describe('GIVEN two packages', () => {
    it('WHEN labelled with scopes hidden THEN there is one label per package, keyed by name', () => {
      const labels = labelsOf([SCOPED, PLAIN], false);

      expect([...labels]).toStrictEqual([
        ['@org/x', 'x'],
        ['app', 'app']
      ]);
    });

    it('WHEN labelled with scopes shown THEN the root // has no label', () => {
      const labels = labelsOf([SCOPED, PLAIN], true);

      expect(labels.has('//')).toBe(false);
    });
  });
});
