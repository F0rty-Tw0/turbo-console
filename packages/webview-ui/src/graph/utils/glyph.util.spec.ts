import { describe, expect, it } from 'vitest';

import { glyphOf } from './glyph.util.ts';
import { GLYPH_CODE_POINTS } from '../common/graph-glyph.const.ts';

const QUESTION = String.fromCodePoint(0xeb32);
const HISTORY = String.fromCodePoint(0xea82);
const BLANK = String.fromCodePoint(0xec03);
const SYNC = String.fromCodePoint(0xea77);
const PULSE = String.fromCodePoint(0xeb31);
const PASS = String.fromCodePoint(0xeba4);
const ERROR = String.fromCodePoint(0xea87);
const STOP = String.fromCodePoint(0xead7);

describe('FEATURE: node glyph', () => {
  describe('GIVEN the classes of a task or file node', () => {
    it.each([
      [['task', 'run-running'], '\uea77'],
      [['task', 'run-continuous'], '\ueb31'],
      [['task', 'run-passed'], '\ueba4'],
      [['task', 'run-failed'], '\uea87'],
      [['task', 'run-failed-to-start'], '\uea87'],
      [['task', 'run-stopped'], '\uead7'],
      [['atom-file', 'atom-passed'], '\ueba4'],
      [['atom-file', 'atom-failed'], '\uea87'],
      [['atom-file', 'atom-cached'], '\uea82'],
      [['atom-file', 'atom-cached', 'run-running'], '\uea77'],
      [['atom-file'], '\uec03'],
      [['task'], '\uec03'],
      [[], '\uec03']
    ])('WHEN the classes are %j THEN the glyph is %s', (classes, glyph) => {
      expect(glyphOf(classes)).toBe(glyph);
    });
  });

  describe('GIVEN a node with a prediction class', () => {
    it.each([
      [['task', 'predict-cached'], HISTORY],
      [['task', 'predict-unknown'], QUESTION],
      [['task', 'predict-notCached'], BLANK],
      [['task', 'run-running', 'predict-cached'], SYNC],
      [['task', 'run-continuous', 'predict-unknown'], PULSE],
      [['task', 'run-passed', 'predict-cached'], HISTORY],
      [['task', 'run-failed', 'predict-unknown'], QUESTION],
      [['task', 'run-passed', 'predict-notCached'], PASS],
      [['task', 'run-failed', 'predict-notCached'], ERROR],
      [['task', 'run-stopped', 'predict-notCached'], STOP],
      [['atom-file', 'atom-failed', 'predict-cached'], HISTORY],
      [['atom-file', 'atom-failed', 'predict-notCached'], ERROR]
    ])('WHEN the classes are %j THEN the glyph is %s', (classes, glyph) => {
      expect(glyphOf(classes)).toBe(glyph);
    });
  });

  describe('GIVEN the glyph table', () => {
    it('WHEN question is read THEN it is U+EB32', () => {
      expect(GLYPH_CODE_POINTS.question).toBe(QUESTION);
    });
  });
});
