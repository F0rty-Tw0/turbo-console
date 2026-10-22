import { describe, expect, it } from 'vitest';

import { explainPlanOf, explainStateOf, isReplyFor } from './explain-state.util.ts';
import type {
  EdgeExplainResult,
  GraphEdgeExplainedMessage,
  ManifestContext,
  ManifestEntry
} from '../../bridge/common/graph-message.type.ts';
import type { ExplainState } from '../common/details.type.ts';
import type { ExplainPlan } from '../common/graph-details.type.ts';
import type { Inspection } from '../common/inspection.type.ts';

const FILE = 'a/package.json';

const E: ManifestEntry = { field: 'dependencies', key: 'ui', spec: '^1.0.0', line: 2, context: {} };

const X_BEFORE: ManifestContext = { before: 'x' };

const Y_BEFORE: ManifestContext = { before: 'y' };

const Y_AFTER: ManifestContext = { after: 'y' };

const BEFORE_X: ManifestEntry = { ...E, context: X_BEFORE };

const BEFORE_Y_MOVED: ManifestEntry = { ...E, line: 4, context: Y_BEFORE };

const AFTER_Y: ManifestEntry = { ...E, context: Y_AFTER };

const found = (entries: ManifestEntry[]): ExplainState => {
  const state: ExplainState = { kind: 'found', file: FILE, entries };

  return state;
};

const READING: ExplainState = { kind: 'reading', file: FILE };

const MISSING: ExplainState = { kind: 'missing', file: FILE, target: 'ui' };

const UNREADABLE: ExplainState = { kind: 'unreadable', file: FILE };

const FOUND_RESULT: EdgeExplainResult = { kind: 'found', file: FILE, entries: [E] };

const FOUND_STATE: ExplainState = { kind: 'found', file: FILE, entries: [E] };

const MISSING_RESULT: EdgeExplainResult = { kind: 'missing', file: FILE };

const UNREADABLE_RESULT: EdgeExplainResult = { kind: 'unreadable', file: FILE };

const reply = (source: string, target: string): GraphEdgeExplainedMessage => {
  const message: GraphEdgeExplainedMessage = { type: 'edgeExplained', source, target, result: MISSING_RESULT };

  return message;
};

const link = (source: string, target: string): Inspection => {
  const inspection: Inspection = { kind: 'link', source, target };

  return inspection;
};

const PKG_WEB: Inspection = { kind: 'package', name: 'web' };

type StateRow = {
  readonly title: string;
  readonly result: EdgeExplainResult;
  readonly expected: ExplainState;
};

type ReplyRow = {
  readonly title: string;
  readonly message: GraphEdgeExplainedMessage;
  readonly current: Inspection | null;
  readonly expected: boolean;
};

type ExplainPlanRow = {
  readonly title: string;
  readonly previous: ExplainState;
  readonly next: ExplainState;
  readonly expected: ExplainPlan;
};

const STATE_ROWS: StateRow[] = [
  { title: 'found', result: FOUND_RESULT, expected: FOUND_STATE },
  { title: 'missing', result: MISSING_RESULT, expected: MISSING },
  { title: 'unreadable', result: UNREADABLE_RESULT, expected: UNREADABLE }
];

const REPLY_ROWS: ReplyRow[] = [
  { title: 'the shown link', message: reply('web', 'ui'), current: link('web', 'ui'), expected: true },
  { title: 'the shown link reversed', message: reply('ui', 'web'), current: link('web', 'ui'), expected: false },
  { title: 'another source into the shown target', message: reply('admin', 'ui'), current: link('web', 'ui'), expected: false },
  { title: 'a link while a package shows', message: reply('web', 'ui'), current: PKG_WEB, expected: false },
  { title: 'a link before anything shows', message: reply('web', 'ui'), current: null, expected: false },
  {
    title: 'the shown __proto__ link',
    message: reply('__proto__', 'constructor'),
    current: link('__proto__', 'constructor'),
    expected: true
  }
];

const EXPLAIN_PLAN_ROWS: ExplainPlanRow[] = [
  { title: 'reading, then two entries', previous: READING, next: found([E, E]), expected: 'rebuild' },
  { title: 'two entries, then the same two', previous: found([E, E]), next: found([E, E]), expected: 'update' },
  { title: 'two entries, then one', previous: found([E, E]), next: found([E]), expected: 'rebuild' },
  { title: 'one row, then two rows', previous: found([E]), next: found([BEFORE_X]), expected: 'rebuild' },
  {
    title: 'the same rows with new text and numbers',
    previous: found([BEFORE_X]),
    next: found([BEFORE_Y_MOVED]),
    expected: 'update'
  },
  { title: 'the same row count with the entry row moved', previous: found([BEFORE_X]), next: found([AFTER_Y]), expected: 'update' },
  { title: 'missing, then missing', previous: MISSING, next: MISSING, expected: 'update' },
  { title: 'unreadable, then unreadable', previous: UNREADABLE, next: UNREADABLE, expected: 'update' },
  { title: 'reading, then reading', previous: READING, next: READING, expected: 'update' },
  { title: 'one entry, then unreadable', previous: found([E]), next: UNREADABLE, expected: 'rebuild' }
];

describe('FEATURE: explain state', () => {
  describe('GIVEN a reply for the link to ui', () => {
    it.each(STATE_ROWS)('WHEN the result is $title THEN the state is exact', (row) => {
      const state = explainStateOf(row.result, 'ui');

      expect(state).toStrictEqual(row.expected);
    });
  });

  describe('GIVEN an edgeExplained message', () => {
    it.each(REPLY_ROWS)('WHEN it answers $title THEN it matches: $expected', (row) => {
      const isReply = isReplyFor(row.message, row.current);

      expect(isReply).toBe(row.expected);
    });
  });

  describe('GIVEN the explain state shown and the next one', () => {
    it.each(EXPLAIN_PLAN_ROWS)('WHEN $title THEN the plan is $expected', (row) => {
      const plan = explainPlanOf(row.previous, row.next);

      expect(plan).toBe(row.expected);
    });
  });
});
