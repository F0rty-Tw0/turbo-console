import type { ManifestContext, ManifestEntry } from '@turbo-console/webview-ui';

import { entry, rows } from '../utils/manifest-entry.spec.util.ts';

export const BOM_STUB: string = '﻿';

export const PLAIN_STUB: string[] = ['{', '  "name": "web",', '  "dependencies": {', '    "core": "^1.0.0"', '  }', '}'];

export const IN_BLOCK_STUB: ManifestContext = { before: '  "dependencies": {', after: '  }' };

export const PLAIN_ENTRIES_STUB: ManifestEntry[] = [entry('dependencies', 'core', '^1.0.0', 3, IN_BLOCK_STUB)];

const LONG_NEIGHBOUR = `    "zz": "${'z'.repeat(189)}…`;

export const CONTEXT_CASES_STUB: [string, string, string, ManifestEntry[]][] = [
  [
    'a key on line 0: no before',
    rows('\n', '{ "dependencies": { "core": "1" },', '  "x": 1 }'),
    'core',
    [entry('dependencies', 'core', '1', 0, { after: '  "x": 1 }' })]
  ],
  [
    'a key on the last line: no after',
    rows('\n', '{', '  "dependencies": {', '    "core": "1" } }'),
    'core',
    [entry('dependencies', 'core', '1', 2, { before: '  "dependencies": {' })]
  ],
  ['a one-line file: neither side', '{"dependencies":{"core":"1"}}', 'core', [entry('dependencies', 'core', '1', 0, {})]],
  [
    'empty neighbour lines',
    rows('\n', '{', '  "dependencies": {', '', '    "core": "1"', '', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 3, { before: '', after: '' })]
  ],
  ['CR LF neighbours, no CR kept', rows('\r\n', ...PLAIN_STUB), 'core', PLAIN_ENTRIES_STUB],
  ['lone CR neighbours', rows('\r', ...PLAIN_STUB), 'core', PLAIN_ENTRIES_STUB],
  ['a BOM_STUB on line 0 and CR LF line ends', `${BOM_STUB}${rows('\r\n', ...PLAIN_STUB)}`, 'core', PLAIN_ENTRIES_STUB],
  [
    'a BOM_STUB that stays on its line as the before neighbour',
    rows('\n', `${BOM_STUB}{`, '  "dependencies": { "core": "1" }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 1, { before: `${BOM_STUB}{`, after: '}' })]
  ],
  [
    'a trailing break: the empty last line is the after neighbour',
    rows('\n', '{"dependencies":{', '"core":"1"}}', ''),
    'core',
    [entry('dependencies', 'core', '1', 1, { before: '{"dependencies":{', after: '' })]
  ],
  [
    'a key and its value on different lines',
    rows('\n', '{', '  "dependencies": {', '    "core":', '      "1"', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 2, { before: '  "dependencies": {', after: '      "1"' })]
  ],
  [
    'two entries, each with its own neighbours',
    rows('\n', '{', '  "dependencies": {', '    "core": "1",', '    "core": "2"', '  }', '}'),
    'core',
    [
      entry('dependencies', 'core', '1', 2, { before: '  "dependencies": {', after: '    "core": "2"' }),
      entry('dependencies', 'core', '2', 3, { before: '    "core": "1",', after: '  }' })
    ]
  ],
  [
    'a before neighbour over 200 characters is cut',
    rows('\n', '{', '  "dependencies": {', `    "zz": "${'z'.repeat(250)}",`, '    "core": "1"', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 3, { before: LONG_NEIGHBOUR, after: '  }' })]
  ],
  [
    'an after neighbour over 200 characters is cut',
    rows('\n', '{', '  "dependencies": {', '    "core": "1",', `    "zz": "${'z'.repeat(250)}"`, '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 2, { before: '  "dependencies": {', after: LONG_NEIGHBOUR })]
  ],
  [
    'a neighbour whose cut would split a surrogate pair: the pair is dropped whole',
    rows('\n', '{', '  "dependencies": {', `    "zz": "${'a'.repeat(188)}😀tail",`, '    "core": "1"', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 3, { before: `    "zz": "${'a'.repeat(188)}…`, after: '  }' })]
  ]
];

const SHOWN = '\uFFFD';

const inField = (inner: string): string => rows('\n', '{', '  "dependencies": {', inner, '  }', '}');

/** One row per class of bidi or invisible control character, each in another part of the entry; all are shown as U+FFFD. */
export const BIDI_CASES_STUB: [string, string, string, ManifestEntry[]][] = [
  [
    'LRM and RLM in the spec',
    inField('    "core": "^1\u200E\u200F"'),
    'core',
    [entry('dependencies', 'core', `^1${SHOWN}${SHOWN}`, 2, IN_BLOCK_STUB)]
  ],
  [
    'every embedding and override in the before neighbour',
    rows('\n', '{', '  "dependencies": {', '    "\u202Aa\u202Bb\u202Cc\u202Dd\u202Ee": "1",', '    "core": "1"', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 3, { before: `    "${SHOWN}a${SHOWN}b${SHOWN}c${SHOWN}d${SHOWN}e": "1",`, after: '  }' })]
  ],
  [
    'every isolate in the after neighbour',
    rows('\n', '{', '  "dependencies": {', '    "core": "1",', '    "\u2066a\u2067b\u2068c\u2069": "2"', '  }', '}'),
    'core',
    [entry('dependencies', 'core', '1', 2, { before: '  "dependencies": {', after: `    "${SHOWN}a${SHOWN}b${SHOWN}c${SHOWN}": "2"` })]
  ],
  [
    'an ALM in an alias key',
    inField('    "\u061Ccore": "npm:core@1"'),
    'core',
    [entry('dependencies', `${SHOWN}core`, 'npm:core@1', 2, IN_BLOCK_STUB)]
  ],
  [
    'an override straddling the 200 character cut: it is shown, and the cut still keeps 200',
    inField(`    "core": "${'s'.repeat(199)}\u202Etail"`),
    'core',
    [entry('dependencies', 'core', `${'s'.repeat(199)}${SHOWN}…`, 2, IN_BLOCK_STUB)]
  ]
];
