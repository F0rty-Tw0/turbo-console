import type { ManifestContext, ManifestEntry } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { manifestEntriesOf } from './manifest-entries.util.ts';
import {
  BIDI_CASES_STUB,
  BOM_STUB,
  CONTEXT_CASES_STUB,
  IN_BLOCK_STUB,
  PLAIN_ENTRIES_STUB,
  PLAIN_STUB
} from '../test/stubs/manifest-entries.stub.ts';
import { entry, rows } from '../test/utils/manifest-entry.spec.util.ts';

const around = (lines: string[], line: number): ManifestContext => {
  const before = lines[line - 1];
  const after = lines[line + 1];

  if (before === undefined || after === undefined) throw new Error(`line ${line} has no neighbour on both sides`);

  const context: ManifestContext = { before, after };

  return context;
};

const ALIAS_LINES = [
  '{',
  '  "dependencies": {',
  '    "a": "npm:core@^1.2.0",',
  '    "b": "workspace:core@*",',
  '    "c": "npm:core",',
  '    "d": "workspace:core",',
  '    "e": "npm:core-extra@1",',
  '    "f": "npm:other@core"',
  '  }',
  '}'
];

const ALIAS_ENTRIES = [
  entry('dependencies', 'a', 'npm:core@^1.2.0', 2, { before: '  "dependencies": {', after: '    "b": "workspace:core@*",' }),
  entry('dependencies', 'b', 'workspace:core@*', 3, { before: '    "a": "npm:core@^1.2.0",', after: '    "c": "npm:core",' }),
  entry('dependencies', 'c', 'npm:core', 4, { before: '    "b": "workspace:core@*",', after: '    "d": "workspace:core",' }),
  entry('dependencies', 'd', 'workspace:core', 5, { before: '    "c": "npm:core",', after: '    "e": "npm:core-extra@1",' })
];

const manyAliasLines = (): string[] => {
  const aliases = Array.from({ length: 10 }, (_, i): string => `    "k${i}": "npm:core@1"${i < 9 ? ',' : ''}`);

  const lines = ['{', '  "dependencies": {', ...aliases, '  }', '}'];

  return lines;
};

const MANY_ALIAS_LINES = manyAliasLines();

const MANY_ALIAS_TEXT = rows('\n', ...MANY_ALIAS_LINES);

const manyAliasEntries = (): ManifestEntry[] => {
  return Array.from({ length: 8 }, (_, i): ManifestEntry =>
    entry('dependencies', `k${i}`, 'npm:core@1', 2 + i, around(MANY_ALIAS_LINES, 2 + i))
  );
};

const aliasRows = (prefix: string): string[] =>
  Array.from({ length: 5 }, (_, i): string => `    "${prefix}${i}": "npm:core@1"${i < 4 ? ',' : ''}`);

const DEPENDENCY_ALIASES = aliasRows('d');

const DEV_DEPENDENCY_ALIASES = aliasRows('v');

const SPLIT_ALIAS_LINES = [
  '{',
  '  "dependencies": {',
  ...DEPENDENCY_ALIASES,
  '  },',
  '  "devDependencies": {',
  ...DEV_DEPENDENCY_ALIASES,
  '  }',
  '}'
];

const SPLIT_ALIAS_TEXT = rows('\n', ...SPLIT_ALIAS_LINES);

const splitAliasEntries = (): ManifestEntry[] => {
  const inDependencies = Array.from({ length: 5 }, (_, i): ManifestEntry =>
    entry('dependencies', `d${i}`, 'npm:core@1', 2 + i, around(SPLIT_ALIAS_LINES, 2 + i))
  );
  const inDevDependencies = Array.from({ length: 3 }, (_, i): ManifestEntry =>
    entry('devDependencies', `v${i}`, 'npm:core@1', 9 + i, around(SPLIT_ALIAS_LINES, 9 + i))
  );

  return [...inDependencies, ...inDevDependencies];
};

const LONG_SPEC = `npm:core@${'1'.repeat(300)}`;

const LONG_LINES = ['{', '  "dependencies": {', `    "${'k'.repeat(250)}": "${LONG_SPEC}"`, '  }', '}'];

const LONG_ENTRIES = [entry('dependencies', `${'k'.repeat(200)}…`, `${LONG_SPEC.slice(0, 200)}…`, 2, IN_BLOCK_STUB)];

const found: [string, string, string, ManifestEntry[]][] = [
  ['a plain dependencies entry', rows('\n', ...PLAIN_STUB), 'core', PLAIN_ENTRIES_STUB],
  [
    'the same name in dependencies and peerDependencies, peer listed first, field order wins',
    rows('\n', '{', '  "peerDependencies": { "core": ">=1" },', '  "dependencies": { "core": "^1" }', '}'),
    'core',
    [
      entry('dependencies', 'core', '^1', 2, { before: '  "peerDependencies": { "core": ">=1" },', after: '}' }),
      entry('peerDependencies', 'core', '>=1', 1, { before: '{', after: '  "dependencies": { "core": "^1" }' })
    ]
  ],
  [
    'a devDependencies entry',
    rows('\n', '{', '  "devDependencies": {', '    "core": "workspace:*"', '  }', '}'),
    'core',
    [entry('devDependencies', 'core', 'workspace:*', 2, { before: '  "devDependencies": {', after: '  }' })]
  ],
  [
    'an optionalDependencies entry',
    rows('\n', '{', '  "optionalDependencies": { "core": "1" }', '}'),
    'core',
    [entry('optionalDependencies', 'core', '1', 1, { before: '{', after: '}' })]
  ],
  [
    'npm: and workspace: aliases, with and without a version, and not their look-alikes',
    rows('\n', ...ALIAS_LINES),
    'core',
    ALIAS_ENTRIES
  ],
  [
    'a key that is itself an alias of another package: matched by its key',
    rows('\n', '{', '  "dependencies": {', '    "core": "npm:other@1"', '  }', '}'),
    'core',
    [entry('dependencies', 'core', 'npm:other@1', 2, IN_BLOCK_STUB)]
  ],
  [
    'a number value: the spec is its source text',
    rows('\n', '{', '  "dependencies": {', '    "core": 1', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 2, IN_BLOCK_STUB)]
  ],
  [
    'an object value: the spec is its source text',
    rows('\n', '{', '  "dependencies": {', '    "core": { "v": 1 }', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '{ "v": 1 }', 2, IN_BLOCK_STUB)]
  ],
  [
    'two keys of the same name in one field give two entries',
    rows('\n', '{', '  "dependencies": {', '    "core": "1",', '    "core": "2"', '  }', '}'),
    'core',
    [
      entry('dependencies', 'core', '1', 2, { before: '  "dependencies": {', after: '    "core": "2"' }),
      entry('dependencies', 'core', '2', 3, { before: '    "core": "1",', after: '  }' })
    ]
  ],
  [
    'a duplicate of a field key: the last one wins, as in JSON.parse',
    rows('\n', '{', '  "dependencies": { "core": "1" },', '  "dependencies": { "core": "2" }', '}'),
    'core',
    [entry('dependencies', 'core', '2', 2, { before: '  "dependencies": { "core": "1" },', after: '}' })]
  ],
  [
    'a duplicate of a field key that is not an object: the last object wins',
    rows('\n', '{', '  "dependencies": { "core": "1" },', '  "dependencies": 1', '}'),
    'core',
    [entry('dependencies', 'core', '1', 1, { before: '{', after: '  "dependencies": 1' })]
  ],
  [
    'a non-object field key before an object one',
    rows('\n', '{', '  "dependencies": 1,', '  "dependencies": { "core": "2" }', '}'),
    'core',
    [entry('dependencies', 'core', '2', 2, { before: '  "dependencies": 1,', after: '}' })]
  ],
  [
    'a key and its value on different lines: the line is the key line',
    rows('\n', '{', '  "dependencies": {', '    "core":', '      "1"', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 2, { before: '  "dependencies": {', after: '      "1"' })]
  ]
];

const lineBreaks: [string, string, string, ManifestEntry[]][] = [
  ['CR LF line ends', rows('\r\n', ...PLAIN_STUB), 'core', PLAIN_ENTRIES_STUB],
  ['lone CR line ends', rows('\r', ...PLAIN_STUB), 'core', PLAIN_ENTRIES_STUB],
  ['a BOM_STUB', `${BOM_STUB}${rows('\n', ...PLAIN_STUB)}`, 'core', PLAIN_ENTRIES_STUB],
  ['a BOM_STUB and CR LF line ends', `${BOM_STUB}${rows('\r\n', ...PLAIN_STUB)}`, 'core', PLAIN_ENTRIES_STUB]
];

const IN_BLOCK_COMMA: ManifestContext = { before: '  "dependencies": {', after: '  },' };

const tolerant: [string, string, string, ManifestEntry[]][] = [
  [
    'a comment and a trailing comma',
    rows('\n', '{', '  // note', '  "dependencies": {', '    "core": "^1",', '  },', '}'),
    'core',
    [entry('dependencies', 'core', '^1', 3, IN_BLOCK_COMMA)]
  ]
];

const objectNames: [string, string, string, ManifestEntry[]][] = [
  [
    'a dependency named __proto__',
    rows('\n', '{', '  "dependencies": {', '    "__proto__": "1"', '  }', '}'),
    '__proto__',
    [entry('dependencies', '__proto__', '1', 2, IN_BLOCK_STUB)]
  ],
  [
    'a constructor key aliasing core',
    rows('\n', '{', '  "dependencies": {', '    "constructor": "npm:core@1"', '  }', '}'),
    'core',
    [entry('dependencies', 'constructor', 'npm:core@1', 2, IN_BLOCK_STUB)]
  ]
];

const cuts: [string, string, string, ManifestEntry[]][] = [
  ['more than 8 matches are cut to 8', MANY_ALIAS_TEXT, 'core', manyAliasEntries()],
  ['5 matches in dependencies and 5 in devDependencies are cut to 8 in field order', SPLIT_ALIAS_TEXT, 'core', splitAliasEntries()],
  ['a key and a spec over 200 characters are cut with an ellipsis', rows('\n', ...LONG_LINES), 'core', LONG_ENTRIES],
  [
    'a spec of exactly 200 characters is kept whole',
    rows('\n', '{', '  "dependencies": {', `    "core": "${'s'.repeat(200)}"`, '  }', '}'),
    'core',
    [entry('dependencies', 'core', 's'.repeat(200), 2, IN_BLOCK_STUB)]
  ],
  [
    'an emoji straddling the 200 character cut: it is dropped whole, never split',
    rows('\n', '{', '  "dependencies": {', `    "core": "${'s'.repeat(199)}😀tail"`, '  }', '}'),
    'core',
    [entry('dependencies', 'core', `${'s'.repeat(199)}…`, 2, IN_BLOCK_STUB)]
  ],
  [
    'an emoji ending exactly at the 200 character cut: it is kept whole',
    rows('\n', '{', '  "dependencies": {', `    "core": "${'s'.repeat(198)}😀tail"`, '  }', '}'),
    'core',
    [entry('dependencies', 'core', `${'s'.repeat(198)}😀…`, 2, IN_BLOCK_STUB)]
  ]
];

const FOUND_CASES = [...found, ...lineBreaks, ...tolerant, ...objectNames, ...cuts];

const missing: [string, string, string, ManifestEntry[]][] = [
  ['no entry in the fields', rows('\n', '{', '  "dependencies": { "other": "1" }', '}'), 'core', []],
  ['no dependency fields at all', '{ "name": "web" }', 'core', []],
  ['a field that is not an object', '{ "dependencies": ["core"], "devDependencies": "core" }', 'core', []],
  ['the name only in an unlisted field', '{ "bundledDependencies": { "core": "1" } }', 'core', []]
];

const unreadable: [string, string, string, null][] = [
  ['empty text', '', 'core', null],
  ['blanks only', '   \n', 'core', null],
  ['an array root', '[{ "dependencies": { "core": "1" } }]', 'core', null],
  ['a string root', '"core"', 'core', null],
  ['a number root', '42', 'core', null],
  ['nesting deep enough to overflow the parser', `{ "dependencies": { "core": "1" }, "x": ${'['.repeat(10_000)}`, 'core', null]
];

const CPU_BUDGET_MS = 1_000;

const flood = (): string => {
  const aliases = Array.from({ length: 50_000 }, (_, i): string => `    "k${i}": "npm:core@1",`);

  return rows('\n', '{', '  "dependencies": {', ...aliases, '    "end": "1"', '  }', '}');
};

const FLOOD_TEXT = flood();

const cpuMsOf = (work: () => void): number => {
  const before = process.cpuUsage();

  work();

  const { user, system } = process.cpuUsage(before);

  return (user + system) / 1_000;
};

describe('FEATURE: manifestEntriesOf', () => {
  describe('GIVEN a manifest that names the dependency', () => {
    it.each(FOUND_CASES)('WHEN it has %s THEN the entries are listed', (_label, text, dependency, expected) => {
      const entries = manifestEntriesOf(text, dependency);

      expect(entries).toStrictEqual(expected);
    });
  });

  describe('GIVEN a manifest whose entries have neighbour lines', () => {
    it.each(CONTEXT_CASES_STUB)('WHEN it has %s THEN the context is filled', (_label, text, dependency, expected) => {
      const entries = manifestEntriesOf(text, dependency);

      expect(entries).toStrictEqual(expected);
    });
  });

  describe('GIVEN a manifest with bidi or invisible control characters', () => {
    it.each(BIDI_CASES_STUB)('WHEN it has %s THEN each is shown as U+FFFD', (_label, text, dependency, expected) => {
      const entries = manifestEntriesOf(text, dependency);

      expect(entries).toStrictEqual(expected);
    });
  });

  describe('GIVEN a manifest that does not name the dependency', () => {
    it.each(missing)('WHEN it has %s THEN the list is empty', (_label, text, dependency, expected) => {
      const entries = manifestEntriesOf(text, dependency);

      expect(entries).toStrictEqual(expected);
    });
  });

  describe('GIVEN a text with no object root', () => {
    it.each(unreadable)('WHEN it is %s THEN it is unreadable', (_label, text, dependency, expected) => {
      const entries = manifestEntriesOf(text, dependency);

      expect(entries).toBe(expected);
    });
  });

  describe('GIVEN a manifest of about 1 MiB where every entry matches', () => {
    it('WHEN it is read THEN the first 8 entries come back within the CPU budget', () => {
      let entries: ManifestEntry[] | null = null;

      const cpuMs = cpuMsOf(() => {
        entries = manifestEntriesOf(FLOOD_TEXT, 'core');
      });

      expect(FLOOD_TEXT.length).toBeGreaterThan(1_000_000);
      expect(entries).toHaveLength(8);
      expect(cpuMs).toBeLessThan(CPU_BUDGET_MS);
    });
  });
});
