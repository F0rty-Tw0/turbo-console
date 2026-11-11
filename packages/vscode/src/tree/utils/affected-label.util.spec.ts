import { describe, expect, it } from 'vitest';

import { affectedLabelOf } from './affected-label.util.ts';
import type { AffectedStatus, AffectedView } from '../common/affected.type.ts';
import { AFFECTED_VIEW_STUB } from '../test/stubs/affected-view.stub.ts';

type Read = { readonly status: AffectedStatus; readonly view: AffectedView | null };

const TASK_VIEW: AffectedView = AFFECTED_VIEW_STUB;
const PACKAGE_VIEW: AffectedView = { ...AFFECTED_VIEW_STUB, mode: 'package' };
const LOADED_TASK: Read = { status: 'loaded', view: TASK_VIEW };
const LOADED_PACKAGE: Read = { status: 'loaded', view: PACKAGE_VIEW };
const FAILED: Read = { status: 'failed', view: null };
const LOADING_NEW: Read = { status: 'loading', view: null };
const ABSENT: Read = { status: 'absent', view: null };
const LOADING_TASK: Read = { status: 'loading', view: TASK_VIEW };
const LOADING_PACKAGE: Read = { status: 'loading', view: PACKAGE_VIEW };
const UNAVAILABLE = 'affected: unavailable, see Output';
const CHECKING = 'affected: checking…';

const labelOf = (shown: boolean, reads: ReadonlyMap<string, Read>): string => {
  const roots = Array.from(reads.keys());
  const affected = {
    view: (root: string): AffectedView | null => reads.get(root)?.view ?? null,
    status: (root: string): AffectedStatus => reads.get(root)?.status ?? 'absent'
  };

  return affectedLabelOf(shown, roots, affected);
};

describe('FEATURE: affectedLabelOf', () => {
  it.each<[string, string, boolean, Record<string, Read>]>([
    ['the toggle is off and the root failed', '', false, { '/a': FAILED }],
    ['there are no roots', '', true, {}],
    ['every root is absent', '', true, { '/a': ABSENT }],
    ['one root failed', UNAVAILABLE, true, { '/a': FAILED }],
    ['one failed and one loaded', UNAVAILABLE, true, { '/a': FAILED, '/b': LOADED_TASK }],
    ['one failed and one loading without a result', UNAVAILABLE, true, { '/a': FAILED, '/b': LOADING_NEW }],
    ['one failed and one absent', UNAVAILABLE, true, { '/a': FAILED, '/b': ABSENT }],
    ['one loading without a result', CHECKING, true, { '/a': LOADING_NEW }],
    ['one loading without a result and one loaded', CHECKING, true, { '/a': LOADING_NEW, '/b': LOADED_TASK }],
    ['one loading with an earlier result', 'affected: task level', true, { '/a': LOADING_TASK }],
    ['one root loaded at task level', 'affected: task level', true, { '/ws': LOADED_TASK }],
    ['one root loaded at package level', 'affected: package level', true, { '/ws': LOADED_PACKAGE }],
    ['two roots loaded at the same level', 'affected: task level', true, { '/a': LOADED_TASK, '/b': LOADED_TASK }],
    ['two roots loaded at different levels', 'affected: mixed levels', true, { '/a': LOADED_TASK, '/b': LOADED_PACKAGE }],
    [
      'a loading root with a package result and a loaded task root',
      'affected: mixed levels',
      true,
      { '/a': LOADING_PACKAGE, '/b': LOADED_TASK }
    ],
    ['one loaded and one absent', 'affected: task level', true, { '/a': LOADED_TASK, '/b': ABSENT }]
  ])('GIVEN %s WHEN the label is read THEN it reads "%s"', (_name, expected, shown, reads) => {
    expect(labelOf(shown, new Map(Object.entries(reads)))).toBe(expected);
  });
});
