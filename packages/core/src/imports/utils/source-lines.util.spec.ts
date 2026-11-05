import { describe, expect, it } from 'vitest';

import { bodyStartOf, lineIndexOf, lineStartsOf, lineTextOf } from './source-lines.util.ts';

describe('FEATURE: line starts and line text of a source file', () => {
  describe('GIVEN a text with line breaks', () => {
    it.each([
      { title: '\\n breaks', text: 'a\nb\nc', expected: [0, 2, 4] },
      { title: '\\r\\n breaks', text: 'a\r\nb', expected: [0, 3] },
      { title: 'lone \\r breaks', text: 'a\rb', expected: [0, 2] },
      { title: 'a mix', text: 'a\r\n\rb\n', expected: [0, 3, 4, 6] },
      { title: 'an empty text', text: '', expected: [0] },
      { title: 'a leading BOM', text: `${String.fromCodePoint(0xfeff)}a\nb`, expected: [1, 3] }
    ])('WHEN line starts of $title are read THEN they are $expected', ({ text, expected }) => {
      expect(lineStartsOf(text)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a text', () => {
    it.each([
      { title: 'a leading BOM', text: `${String.fromCodePoint(0xfeff)}a`, expected: 1 },
      { title: 'no BOM', text: 'a', expected: 0 },
      { title: 'an empty text', text: '', expected: 0 }
    ])('WHEN the body start of $title is read THEN it is $expected', ({ text, expected }) => {
      expect(bodyStartOf(text)).toBe(expected);
    });
  });

  describe('GIVEN the line starts [0, 2, 4]', () => {
    it.each([
      [0, 0],
      [1, 0],
      [2, 1],
      [5, 2]
    ])('WHEN offset %i is located THEN it is line %i', (offset, expected) => {
      expect(lineIndexOf([0, 2, 4], offset)).toBe(expected);
    });
  });

  describe('GIVEN a line text', () => {
    it('WHEN line 0 text of a CRLF text is read THEN it has no \\r', () => {
      const text = 'import a\r\nb';

      expect(lineTextOf(text, lineStartsOf(text), 0)).toBe('import a');
    });

    it('WHEN line 0 text of a BOM text is read THEN it starts after the BOM', () => {
      const text = `${String.fromCodePoint(0xfeff)}import a\nb`;

      expect(lineTextOf(text, lineStartsOf(text), 0)).toBe('import a');
    });

    it('WHEN the last line text is read THEN it runs to the end of the text', () => {
      const text = 'a\nb';

      expect(lineTextOf(text, lineStartsOf(text), 1)).toBe('b');
    });

    it.each([
      { title: 'a CRLF empty line', text: '\r\nb', line: 0, expected: '' },
      { title: 'a lone CR line', text: 'a\rb', line: 0, expected: 'a' },
      { title: 'a line past the last line', text: 'a\nb', line: 5, expected: '' },
      { title: 'a negative line', text: 'a\nb', line: -1, expected: '' }
    ])('WHEN the text of $title is read THEN it is $expected', ({ text, line, expected }) => {
      expect(lineTextOf(text, lineStartsOf(text), line)).toBe(expected);
    });

    it('WHEN a 1,500-char CRLF line text is read THEN it is the first 1,000 chars', () => {
      const text = `${'x'.repeat(1500)}\r\nb`;

      expect(lineTextOf(text, lineStartsOf(text), 0)).toBe('x'.repeat(1000));
    });

    it('WHEN a 1,500-char line text is read THEN it is the first 1,000 chars', () => {
      const text = 'x'.repeat(1500);

      expect(lineTextOf(text, lineStartsOf(text), 0)).toBe('x'.repeat(1000));
    });
  });
});
