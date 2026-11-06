import { describe, expect, it } from 'vitest';

import { sourceTokensOf } from './source-tokens.util.ts';
import { GENERATED_BLOCK_KEYWORDS } from '../test/common/generated-source.const.ts';
import { ONE_MIB } from '../test/common/source-size.const.ts';
import { generatedBlocksOf, generatedSourceOf } from '../test/utils/generated-source.spec.util.ts';
import { isKeywordToken, labelsOf } from '../test/utils/source-token-labels.spec.util.ts';

const BOM = String.fromCodePoint(0xfeff);

const NON_ASCII_SPACES: [string, number][] = [
  ['a no-break space', 0x00a0],
  ['a line separator', 0x2028],
  ['a paragraph separator', 0x2029],
  ['a mid-file BOM', 0xfeff],
  ['an ogham space mark', 0x1680],
  ['an en quad', 0x2000],
  ['a hair space', 0x200a],
  ['a narrow no-break space', 0x202f],
  ['a medium mathematical space', 0x205f],
  ['an ideographic space', 0x3000]
];

describe('FEATURE: tokenizing a TS or JS source for import scanning', () => {
  describe('GIVEN plain code', () => {
    it("WHEN `import x from 'S';` is tokenized THEN it is word import, word x, word from, string S, punct ;", () => {
      const labels = labelsOf("import x from 'S';");

      expect(labels).toStrictEqual(['word:import', 'word:x', 'word:from', 'string:S', 'punct:;']);
    });

    it('WHEN a token follows a CRLF and a comment THEN its start offset is its index in the text', () => {
      const starts = sourceTokensOf('import a\r\n// c\r\n  x').map((token) => token.start);

      expect(starts).toStrictEqual([0, 7, 18]);
    });
  });

  describe('GIVEN comments', () => {
    it.each(["// import 'A'\n", "/* import 'A' */", "/* a\nimport 'A'\n*/"])(
      'WHEN %j is tokenized THEN no token comes back',
      (text) => {
        expect(sourceTokensOf(text)).toStrictEqual([]);
      }
    );

    it.each([
      ['a block comment', 'a /* c */ / 2 / b'],
      ['a line comment', 'a // c\n/ 2 / b']
    ])('WHEN %s sits before a slash THEN the slash is a division', (_name, text) => {
      const labels = labelsOf(text);

      expect(labels).toStrictEqual(['word:a', 'punct:/', 'word:2', 'punct:/', 'word:b']);
    });
  });

  describe('GIVEN a slash', () => {
    it.each([
      ['a regex holding a quote opens no string', "x = /'/; import 'A'", ['word:x', 'punct:=', 'punct:;', 'word:import', 'string:A']],
      [
        'division after )',
        "a = (b) / 2 / c; import 'A'",
        [
          'word:a',
          'punct:=',
          'punct:(',
          'word:b',
          'punct:)',
          'punct:/',
          'word:2',
          'punct:/',
          'word:c',
          'punct:;',
          'word:import',
          'string:A'
        ]
      ],
      [
        'division after ]',
        "a = x[0] / 2; import 'A'",
        ['word:a', 'punct:=', 'word:x', 'punct:[', 'word:0', 'punct:]', 'punct:/', 'word:2', 'punct:;', 'word:import', 'string:A']
      ],
      [
        '} then regex',
        "} /'/.test(s); import 'A'",
        ['punct:}', 'punct:.', 'word:test', 'punct:(', 'word:s', 'punct:)', 'punct:;', 'word:import', 'string:A']
      ],
      [
        'regex after return',
        "return /'/.test(s); import 'A'",
        ['word:return', 'punct:.', 'word:test', 'punct:(', 'word:s', 'punct:)', 'punct:;', 'word:import', 'string:A']
      ],
      ['a regex followed by a slash: the slash divides', 'x = /a/ / b', ['word:x', 'punct:=', 'punct:/', 'word:b']],
      [
        'a regex first in the text',
        "/'/.test(s); import 'A'",
        ['punct:.', 'word:test', 'punct:(', 'word:s', 'punct:)', 'punct:;', 'word:import', 'string:A']
      ],
      ['a regex alone in the text', "/'/; import 'A'", ['punct:;', 'word:import', 'string:A']],
      ['division after a word', 'a = b / c / d', ['word:a', 'punct:=', 'word:b', 'punct:/', 'word:c', 'punct:/', 'word:d']]
    ])('WHEN %s: %j is tokenized THEN the tokens are %j', (_name, text, expected) => {
      expect(labelsOf(text)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a template', () => {
    it("WHEN `a ${import('S')} b` is tokenized THEN it is complex, word import, punct (, string S, punct ) and nothing after", () => {
      const labels = labelsOf("`a ${import('S')} b`");

      expect(labels).toStrictEqual(['complex:', 'word:import', 'punct:(', 'string:S', 'punct:)']);
    });

    it('WHEN `${ {a: 1} }` holds an object literal THEN the inner braces are punct and the template closes after', () => {
      const labels = labelsOf('`${ {a: 1} }`');

      expect(labels).toStrictEqual(['complex:', 'punct:{', 'word:a', 'punct::', 'word:1', 'punct:}']);
    });

    it("WHEN a nested template `${`${y}`}` is followed by import 'A' THEN the word import and string A are tokens", () => {
      const labels = labelsOf("`${`${y}`}` import 'A'");

      expect(labels).toStrictEqual(['complex:', 'complex:', 'word:y', 'word:import', 'string:A']);
    });

    it('WHEN an unclosed template `abc is tokenized THEN it is one broken token', () => {
      expect(labelsOf('`abc')).toStrictEqual(['broken:']);
    });

    it('WHEN a template unclosed after a substitution `a ${x} b is tokenized THEN no broken token follows', () => {
      const labels = labelsOf('`a ${x} b');

      expect(labels).toStrictEqual(['complex:', 'word:x']);
    });

    it('WHEN a no-substitution template `S` is tokenized THEN it is one template token with value S', () => {
      expect(labelsOf('`S`')).toStrictEqual(['template:S']);
    });

    it("WHEN `${/}/.test(s) ? import('A') : b}` is tokenized THEN the regex after ${ is skipped and word import and string A are tokens", () => {
      const labels = labelsOf("`${/}/.test(s) ? import('A') : b}`");

      expect(labels).toStrictEqual([
        'complex:',
        'punct:.',
        'word:test',
        'punct:(',
        'word:s',
        'punct:)',
        'punct:?',
        'word:import',
        'punct:(',
        'string:A',
        'punct:)',
        'punct::',
        'word:b'
      ]);
    });

    it('WHEN x = `${ {a: 1} }` / 2 / b is tokenized THEN punct / appears twice', () => {
      const labels = labelsOf('x = `${ {a: 1} }` / 2 / b');
      const divisions = labels.filter((label) => label === 'punct:/');

      expect(divisions).toHaveLength(2);
    });
  });

  describe('GIVEN text that resyncs at a line break (R1)', () => {
    it("WHEN JSX text Don't sits on line k and import 'A' on line k+1 THEN word import and string A are tokens", () => {
      const labels = labelsOf("<p>Don't</p>\nimport 'A'");

      expect(labels).toStrictEqual(['punct:<', 'word:p', 'punct:>', 'word:Don', 'broken:', 'word:import', 'string:A']);
    });

    it("WHEN an unclosed 'abc reaches a line break THEN it is a broken token and the next line's tokens follow", () => {
      const labels = labelsOf("x = 'abc\nimport 'A'");

      expect(labels).toStrictEqual(['word:x', 'punct:=', 'broken:', 'word:import', 'string:A']);
    });
  });

  describe('GIVEN a BOM, a spread or non-ASCII text', () => {
    it("WHEN a BOM precedes import 'A' THEN the first token is word import at start 1", () => {
      const [first] = sourceTokensOf(`${BOM}import 'A'`);

      expect(first).toStrictEqual({ kind: 'word', value: 'import', start: 1 });
    });

    it("WHEN [...require('A')] is tokenized THEN punct ... precedes word require", () => {
      const labels = labelsOf("[...require('A')]");

      expect(labels).toStrictEqual(['punct:[', 'punct:...', 'word:require', 'punct:(', 'string:A', 'punct:)', 'punct:]']);
    });

    it.each(NON_ASCII_SPACES)("WHEN %s precedes import 'A' THEN word import and string A are tokens", (_name, code) => {
      const space = String.fromCharCode(code);

      const labels = labelsOf(`x${space}${space}import 'A'`);

      expect(labels).toStrictEqual(['word:x', 'word:import', 'string:A']);
    });

    it('WHEN café = 1 is tokenized THEN café is one word', () => {
      expect(labelsOf('café = 1')).toStrictEqual(['word:café', 'punct:=', 'word:1']);
    });
  });

  describe('GIVEN the generated 1 MiB source', () => {
    it("WHEN it is tokenized THEN the word tokens 'import' and 'require' number blocks x keywords per block", () => {
      const blocks = generatedBlocksOf(ONE_MIB);

      const tokens = sourceTokensOf(generatedSourceOf(ONE_MIB));
      const keywords = tokens.filter(isKeywordToken);

      expect(keywords).toHaveLength(blocks * GENERATED_BLOCK_KEYWORDS);
    });
  });
});
