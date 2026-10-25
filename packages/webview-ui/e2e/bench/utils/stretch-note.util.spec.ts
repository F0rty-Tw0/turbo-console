import { describe, expect, it } from 'vitest';

import { heapNoteOf, panNoteOf } from './stretch-note.util.ts';
import type { StretchPan } from '../common/bench.type.ts';

describe('FEATURE: stretch notes', () => {
  describe('GIVEN a pan', () => {
    it('WHEN it is worded THEN it names the size and the longest long task to one decimal', () => {
      const pan: StretchPan = { p95Ms: 33.4, longestLongTaskMs: 112.04 };

      const note = panNoteOf('L', pan);

      expect(note).toBe('stretch L pan longest long task 112.0 ms');
    });
  });

  describe('GIVEN a heap', () => {
    it('WHEN it is worded THEN it says main JS heap and rounds to one decimal', () => {
      const note = heapNoteOf(39.84);

      expect(note).toBe('stretch L main JS heap 39.8 MB');
    });
  });
});
