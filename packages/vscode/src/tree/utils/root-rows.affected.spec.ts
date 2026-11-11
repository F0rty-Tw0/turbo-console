import { describe, expect, it } from 'vitest';

import { rootNodeRow, rootRowOf } from './root-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import type { AffectedStatus, AffectedView, SharedAffected } from '../common/affected.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import { AFFECTED_VIEW_STUB } from '../test/stubs/affected-view.stub.ts';
import { ROOT_FOLDER_STUB, ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { modelViewWith, rowContextOf } from '../test/utils/row-context.spec.util.ts';

const OTHER_FOLDER: RootFolder = { root: '/other', name: 'other' };

const OTHER_STATE: RootState = { ...ROOT_STATE_STUB, folder: OTHER_FOLDER };

type Answer = { readonly view: AffectedView | null; readonly status: AffectedStatus };

/** Reads that answer per root; a root not listed is absent. */
const contextOf = (answers: ReadonlyMap<string, Answer>): RowContext => {
  const absent: Answer = { view: null, status: 'absent' };
  const answerOf = (root: string): Answer => answers.get(root) ?? absent;
  const affected: Pick<SharedAffected, 'view' | 'status'> = {
    view: (root) => answerOf(root).view,
    status: (root) => answerOf(root).status
  };
  const base = rowContextOf('folders');
  const context: RowContext = { ...base, affected };

  return context;
};

const MIXED = new Map<string, Answer>([
  ['/ws', { view: AFFECTED_VIEW_STUB, status: 'loaded' }],
  ['/other', { view: null, status: 'failed' }]
]);

const FAILED_WS = new Map<string, Answer>([['/ws', { view: null, status: 'failed' }]]);

describe('FEATURE: root row affected line', () => {
  describe('GIVEN a Loaded root /ws and a Failed root /other', () => {
    it('WHEN /ws is built THEN its tooltip ends with the level', () => {
      const row = rootRowOf(ROOT_STATE_STUB, contextOf(MIXED));

      expect(row.tooltip.at(-1)).toBe('Affected: task level');
    });

    it('WHEN /other is built THEN its tooltip ends with unavailable', () => {
      const row = rootRowOf(OTHER_STATE, contextOf(MIXED));

      expect(row.tooltip.at(-1)).toBe('Affected: unavailable');
    });
  });

  describe('GIVEN a root the toggle left absent', () => {
    it('WHEN its row is built THEN the tooltip has no affected line', () => {
      const row = rootRowOf(ROOT_STATE_STUB, contextOf(new Map()));

      expect(row.tooltip.some((line) => line.startsWith('Affected'))).toBe(false);
    });
  });

  describe('GIVEN a root with no model yet', () => {
    it('WHEN it is Failed THEN the tooltip is the path and unavailable', () => {
      const state: RootState = { ...ROOT_STATE_STUB, model: null };

      const row = rootRowOf(state, contextOf(FAILED_WS));

      expect(row.tooltip).toStrictEqual(['/ws', 'Affected: unavailable']);
    });
  });

  describe('GIVEN rootNodeRow with a fourth argument', () => {
    const view = modelViewWith([]);

    it('WHEN a line is given THEN it is the last tooltip line', () => {
      const row = rootNodeRow(ROOT_FOLDER_STUB, view, 0, 'Affected: task level');

      expect(row.tooltip).toStrictEqual(['/ws', 'Packages: 0', 'Affected: task level']);
    });

    it('WHEN the line is null THEN the tooltip is the root and the package count', () => {
      const row = rootNodeRow(ROOT_FOLDER_STUB, view, 0, null);

      expect(row.tooltip).toStrictEqual(['/ws', 'Packages: 0']);
    });
  });
});
