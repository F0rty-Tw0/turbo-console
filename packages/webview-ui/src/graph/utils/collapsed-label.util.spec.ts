import { describe, expect, it } from 'vitest';

import { collapsedLabelOf } from './collapsed-label.util.ts';

const measureOf = (text: string): number => text.length * 7;

describe('FEATURE: collapsedLabelOf', () => {
  it.each([
    ['apps', 2, 'apps\n2 packages'],
    ['apps', 1, 'apps\n1 package'],
    ['(root)', 1, '(root)\n1 package'],
    ['./(root)', 1, './(root)\n1 package'],
    ['sixteen-chars-ok', 3, 'sixteen-chars-ok\n3 packages']
  ])('GIVEN the title %j fits and %i packages WHEN the label is built THEN it is %j', (title, count, expected) => {
    const label = collapsedLabelOf(title, count, measureOf);

    expect(label).toBe(expected);
  });

  it('GIVEN a title measuring exactly 116 px WHEN the label is built THEN the title is kept', () => {
    const label = collapsedLabelOf('apps', 2, () => 116);

    expect(label).toBe('apps\n2 packages');
  });

  it('GIVEN a 25-char title WHEN the label is built THEN the longest prefix that fits with an ellipsis is used', () => {
    const label = collapsedLabelOf('packages/long-folder-name', 3, measureOf);

    expect(label).toBe('packages/long-f…\n3 packages');
  });

  it('GIVEN a title of 20 emoji WHEN the label is built THEN it is cut by code point, not into a surrogate', () => {
    const label = collapsedLabelOf('😀'.repeat(20), 3, measureOf);
    const [firstLine = ''] = label.split('\n');
    const characters = [...firstLine];

    expect(firstLine).toBe(`${'😀'.repeat(7)}…`);
    expect(characters).toHaveLength(8);
  });

  it('GIVEN nothing fits WHEN the label is built THEN the title is only an ellipsis', () => {
    const label = collapsedLabelOf('apps', 3, () => 1000);

    expect(label).toBe('…\n3 packages');
  });
});
