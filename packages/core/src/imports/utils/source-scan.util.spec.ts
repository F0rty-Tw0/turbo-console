import { describe, expect, it } from 'vitest';

import { blockCommentEndOf, lineEndOf, quotedEndOf, regexEndOf, templateChunkOf, wordEndOf } from './source-scan.util.ts';

describe('FEATURE: char scanners of the import lexer', () => {
  describe('GIVEN a quoted string', () => {
    it.each([
      ["'abc' x", 0, { end: 5, isClosed: true }],
      ["'a\\'b' x", 0, { end: 6, isClosed: true }],
      ['"a\\\\" x', 0, { end: 5, isClosed: true }],
      ["Don't\nimport", 3, { end: 5, isClosed: false }],
      ["'a\\\nb'", 0, { end: 3, isClosed: false }],
      ["'abc", 0, { end: 4, isClosed: false }],
      ["'a\\", 0, { end: 3, isClosed: false }]
    ])('WHEN %j is scanned as a quoted string from %i THEN it ends at %o', (text, start, expected) => {
      expect(quotedEndOf(text, start)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a regex', () => {
    it.each([
      ['/a/g.test(x)', 0, 4],
      ["/'/ + x", 0, 3],
      ['/[/]x/ y', 0, 6],
      ['/a\\/b/ y', 0, 6],
      ['/abc\nnext', 0, 4],
      ['/a\\\nb', 0, 3]
    ])('WHEN %j is scanned as a regex from %i THEN it ends at %i', (text, start, expected) => {
      expect(regexEndOf(text, start)).toBe(expected);
    });
  });

  describe('GIVEN a template', () => {
    it.each([
      ['`a${', 1, { end: 4, opensSubstitution: true, isClosed: true }],
      ['`a\nb` x', 1, { end: 5, opensSubstitution: false, isClosed: true }],
      ['`a\\`b` x', 1, { end: 6, opensSubstitution: false, isClosed: true }],
      ['`abc', 1, { end: 4, opensSubstitution: false, isClosed: false }],
      ['`a$b` x', 1, { end: 5, opensSubstitution: false, isClosed: true }],
      ['`a\\', 1, { end: 3, opensSubstitution: false, isClosed: false }]
    ])('WHEN %j is scanned as a template chunk from %i THEN it is %o', (text, start, expected) => {
      expect(templateChunkOf(text, start)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a comment', () => {
    it.each([
      ['/* a */x', 7],
      ['/* a', 4],
      ['/*/ x */y', 8]
    ])('WHEN %j is scanned as a block comment THEN it ends at %i', (text, expected) => {
      expect(blockCommentEndOf(text, 0)).toBe(expected);
    });

    it.each([
      ['// a\nb', 4],
      ['// a\r\nb', 4],
      ['// a', 4]
    ])('WHEN %j is scanned as a line comment THEN it ends at %i', (text, expected) => {
      expect(lineEndOf(text, 0)).toBe(expected);
    });
  });

  describe('GIVEN a word', () => {
    it.each([
      ['import(', 6],
      ['$a_1 ', 4],
      ['café ', 4],
      ['123.5', 3]
    ])('WHEN %j is scanned as a word THEN it ends at %i', (text, expected) => {
      expect(wordEndOf(text, 0)).toBe(expected);
    });

    it.each([
      ['a no-break space', 0x00a0],
      ['a line separator', 0x2028],
      ['a paragraph separator', 0x2029],
      ['a BOM', 0xfeff],
      ['an ogham space mark', 0x1680],
      ['an en quad', 0x2000],
      ['a hair space', 0x200a],
      ['a narrow no-break space', 0x202f],
      ['a medium mathematical space', 0x205f],
      ['an ideographic space', 0x3000]
    ])('WHEN %s sits inside ab?cd THEN the word ends before it', (_name, code) => {
      const text = `ab${String.fromCharCode(code)}cd`;

      expect(wordEndOf(text, 0)).toBe(2);
    });

    it.each([
      ['a zero-width space', 0x200b],
      ['a char just before the ogham space mark', 0x167f],
      ['a char just after the ideographic space', 0x3001]
    ])('WHEN %s sits inside ab?cd THEN it stays a word char', (_name, code) => {
      const text = `ab${String.fromCharCode(code)}cd`;

      expect(wordEndOf(text, 0)).toBe(5);
    });
  });
});
