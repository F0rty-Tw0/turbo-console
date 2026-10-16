import { beforeEach, describe, expect, it } from 'vitest';

import { markAsked, markShown } from './tree-visible-span.util.ts';
import type { Span } from '../../shared/common/span.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { TREE_ROW_STUB } from '../test/stubs/tree-row.stub.ts';

const DIR_ROW: TreeRow = { ...TREE_ROW_STUB, kind: 'dir' };

const MESSAGE_ROW: TreeRow = { ...TREE_ROW_STUB, kind: 'msg' };

describe('FEATURE: tree visible spans', () => {
  let spans: Map<string, Span>;

  beforeEach(() => {
    spans = new Map();
  });

  describe('GIVEN a root never asked for', () => {
    it('WHEN it is asked for THEN its span opens at that time', () => {
      markAsked(spans, '/ws', 3);

      expect(spans.get('/ws')).toStrictEqual({ start: 3, end: null });
    });

    it('WHEN it is asked for twice THEN the span keeps the first time', () => {
      markAsked(spans, '/ws', 3);
      markAsked(spans, '/ws', 9);

      expect(spans.get('/ws')).toStrictEqual({ start: 3, end: null });
    });

    it('WHEN package rows are shown THEN no span is made', () => {
      markShown(spans, '/ws', [TREE_ROW_STUB], 9);

      expect(spans.has('/ws')).toBe(false);
    });
  });

  describe('GIVEN a root with an open span', () => {
    beforeEach(() => {
      markAsked(spans, '/ws', 3);
    });

    it('WHEN a package row is shown THEN the span closes at that time', () => {
      markShown(spans, '/ws', [TREE_ROW_STUB], 9);

      expect(spans.get('/ws')).toStrictEqual({ start: 3, end: 9 });
    });

    it('WHEN a folder row is shown THEN the span closes at that time', () => {
      markShown(spans, '/ws', [MESSAGE_ROW, DIR_ROW], 9);

      expect(spans.get('/ws')).toStrictEqual({ start: 3, end: 9 });
    });

    it('WHEN only message rows are shown THEN the span stays open', () => {
      markShown(spans, '/ws', [MESSAGE_ROW], 9);

      expect(spans.get('/ws')).toStrictEqual({ start: 3, end: null });
    });

    it('WHEN package rows are shown twice THEN the span keeps the first end', () => {
      markShown(spans, '/ws', [TREE_ROW_STUB], 9);
      markShown(spans, '/ws', [TREE_ROW_STUB], 12);

      expect(spans.get('/ws')).toStrictEqual({ start: 3, end: 9 });
    });
  });
});
