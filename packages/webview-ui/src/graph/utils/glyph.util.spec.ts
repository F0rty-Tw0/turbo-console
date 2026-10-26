import { describe, expect, it } from 'vitest';

import { glyphOf } from './glyph.util.ts';

describe('FEATURE: node glyph', () => {
  describe('GIVEN the classes of a task or file node', () => {
    it.each([
      [['task', 'run-running'], '\uea77'],
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
});
