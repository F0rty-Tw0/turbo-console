import { describe, expect, it } from 'vitest';

import { controlsLabelOf, countTextOf, focusLabelOf, folderTitleOf, groupLabelOf, showLabelOf } from './controls-text.util.ts';

describe('FEATURE: controls text', () => {
  describe('GIVEN a folder group header', () => {
    it('WHEN the folder is apps with 3 packages THEN the label is the folder and its count', () => {
      const label = groupLabelOf('apps', 3);

      expect(label).toBe('apps (3)');
    });

    it('WHEN the folder is the root folder with 2 packages THEN the label keeps the root title', () => {
      const label = groupLabelOf('(root)', 2);

      expect(label).toBe('(root) (2)');
    });
  });

  describe('GIVEN a folder title', () => {
    it('WHEN the folder is empty THEN the title is the root folder', () => {
      const title = folderTitleOf('');

      expect(title).toBe('(root)');
    });

    it('WHEN the folder is a real folder named (root) THEN the title is that name', () => {
      const title = folderTitleOf('(root)');

      expect(title).toBe('(root)');
    });

    it('WHEN the folder is apps THEN the title is the folder', () => {
      const title = folderTitleOf('apps');

      expect(title).toBe('apps');
    });
  });

  it('GIVEN 2 of 5 packages visible WHEN the count line is built THEN it names both numbers', () => {
    const text = countTextOf(2, 5);

    expect(text).toBe('Showing 2 of 5 packages');
  });

  describe('GIVEN the package web', () => {
    it('WHEN its show label is built THEN it reads Show web', () => {
      const label = showLabelOf('web');

      expect(label).toBe('Show web');
    });

    it('WHEN its focus label is built THEN it reads Focus web', () => {
      const label = focusLabelOf('web');

      expect(label).toBe('Focus web');
    });
  });

  describe('GIVEN the Controls toggle', () => {
    it('WHEN no filter is on THEN the label is Controls', () => {
      const label = controlsLabelOf(false);

      expect(label).toBe('Controls');
    });

    it('WHEN a filter is on THEN the label says filters are on', () => {
      const label = controlsLabelOf(true);

      expect(label).toBe('Controls (filters on)');
    });
  });

  describe('GIVEN a package named like an Object.prototype key', () => {
    it('WHEN the show label of __proto__ is built THEN it holds the name as text', () => {
      const label = showLabelOf('__proto__');

      expect(label).toBe('Show __proto__');
    });

    it('WHEN the focus label of constructor is built THEN it holds the name as text', () => {
      const label = focusLabelOf('constructor');

      expect(label).toBe('Focus constructor');
    });
  });
});
