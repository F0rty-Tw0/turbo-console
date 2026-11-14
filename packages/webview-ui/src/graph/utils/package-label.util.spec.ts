import { describe, expect, it } from 'vitest';

import { labelIn, labelledSizeOf, labelsOf, packageLabelOf, sizeTextsOf } from './package-label.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { lengthSizeOf } from '../test/utils/length-size.spec.util.ts';

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

  describe('GIVEN the root // package, its bare name the host text of its label', () => {
    it('WHEN labelled both ways THEN both labels are the bare name', () => {
      const root: GraphPackage = { ...PLAIN, name: '//', bareName: 'root-fixture', path: '' };

      const labels = [packageLabelOf(root, true), packageLabelOf(root, false)];

      expect(labels).toStrictEqual(['root-fixture', 'root-fixture']);
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

describe('FEATURE: labelIn', () => {
  describe('GIVEN labels that map @org/x to x', () => {
    const labels = new Map([['@org/x', 'x']]);

    it('WHEN @org/x is looked up THEN it reads x', () => {
      const label = labelIn(labels, '@org/x');

      expect(label).toBe('x');
    });

    it('WHEN a name with no label is looked up THEN it reads as itself', () => {
      const label = labelIn(labels, 'app');

      expect(label).toBe('app');
    });
  });
});

describe('FEATURE: labelledSizeOf', () => {
  it('GIVEN the root // labelled root-fixture WHEN sized THEN the box fits the label', () => {
    const size = labelledSizeOf('//', 'root-fixture', lengthSizeOf);

    expect(size).toStrictEqual({ width: 120, height: 32 });
  });

  it('GIVEN @org/x labelled x with scopes hidden WHEN sized THEN the box keeps the width of the name', () => {
    const size = labelledSizeOf('@org/x', 'x', lengthSizeOf);

    expect(size).toStrictEqual({ width: 60, height: 32 });
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

describe('FEATURE: sizeTextsOf', () => {
  it('GIVEN the root // with a sizeName beside a package without one THEN only // has a sizing text', () => {
    const root: GraphPackage = { ...PLAIN, name: '//', bareName: '(root) savings', sizeName: '(root) savings', path: '' };

    const sizeTexts = sizeTextsOf([root, PLAIN]);

    expect([...sizeTexts]).toStrictEqual([['//', '(root) savings']]);
  });
});

type RootToggleRow = {
  readonly given: string;
  readonly shown: string;
  readonly hidden: string;
  readonly sizeName: string;
};

const rootInfoOf = (bareName: string, sizeName: string): GraphPackage[] => {
  const root: GraphPackage = { ...PLAIN, name: '//', bareName, sizeName, path: '' };

  return [root];
};

const rootBoxOf = (infos: GraphPackage[], scopeShown: boolean): NodeSize => {
  const sizeTexts = sizeTextsOf(infos);
  const labels = labelsOf(infos, scopeShown);

  return labelledSizeOf(sizeTexts.get('//') ?? '//', labelIn(labels, '//'), lengthSizeOf);
};

describe('FEATURE: the // box across scope toggles', () => {
  it.each<RootToggleRow>([
    { given: 'savings', shown: 'savings', hidden: '(root) savings', sizeName: '(root) savings' },
    { given: '@x/app', shown: '@x/app', hidden: '(root) app', sizeName: '(root) @x/app' }
  ])(
    'GIVEN a root labelled $given WHEN sized from the host infos THEN both scope modes give one box that fits the prefixed label',
    (row) => {
      const shownBox = rootBoxOf(rootInfoOf(row.shown, row.sizeName), true);
      const hiddenBox = rootBoxOf(rootInfoOf(row.hidden, row.sizeName), false);

      expect(hiddenBox).toStrictEqual(shownBox);
      expect(hiddenBox).toStrictEqual(lengthSizeOf(row.sizeName));
    }
  );

  it('GIVEN a package with no sizeName WHEN sized from its name THEN the box is as labelledSizeOf(name, label) gives', () => {
    const size = labelledSizeOf('@org/x', 'x', lengthSizeOf);

    expect(size).toStrictEqual({ width: 60, height: 32 });
  });
});
