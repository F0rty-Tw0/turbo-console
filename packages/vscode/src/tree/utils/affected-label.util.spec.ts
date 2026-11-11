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
  it.each<[string, boolean, Record<string, Read>, string]>([
    ['the toggle is off and the root failed', false, { '/a': FAILED }, ''],
    ['there are no roots', true, {}, ''],
    ['every root is absent', true, { '/a': ABSENT }, ''],
    ['one root failed', true, { '/a': FAILED }, UNAVAILABLE],
    ['one failed and one loaded', true, { '/a': FAILED, '/b': LOADED_TASK }, UNAVAILABLE],
    ['one failed and one loading without a result', true, { '/a': FAILED, '/b': LOADING_NEW }, UNAVAILABLE],
    ['one failed and one absent', true, { '/a': FAILED, '/b': ABSENT }, UNAVAILABLE],
    ['one loading without a result', true, { '/a': LOADING_NEW }, CHECKING],
    ['one loading without a result and one loaded', true, { '/a': LOADING_NEW, '/b': LOADED_TASK }, CHECKING],
    ['one loading with an earlier result', true, { '/a': LOADING_TASK }, 'affected: task level'],
    ['one root loaded at task level', true, { '/ws': LOADED_TASK }, 'affected: task level'],
    ['one root loaded at package level', true, { '/ws': LOADED_PACKAGE }, 'affected: package level'],
    ['two roots loaded at the same level', true, { '/a': LOADED_TASK, '/b': LOADED_TASK }, 'affected: task level'],
    ['two roots loaded at different levels', true, { '/a': LOADED_TASK, '/b': LOADED_PACKAGE }, 'affected: mixed levels'],
    [
      'a loading root with a package result and a loaded task root',
      true,
      { '/a': LOADING_PACKAGE, '/b': LOADED_TASK },
      'affected: mixed levels'
    ],
    ['one loaded and one absent', true, { '/a': LOADED_TASK, '/b': ABSENT }, 'affected: task level']
  ])('GIVEN %s WHEN the label is read THEN it is the table row', (_name, shown, reads, expected) => {
    expect(labelOf(shown, new Map(Object.entries(reads)))).toBe(expected);
  });
});
