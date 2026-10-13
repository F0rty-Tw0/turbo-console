import { join, parse } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isWithin } from './path-within.util.ts';

const BOUNDARY = join(parse(process.cwd()).root, 'repo', 'node_modules');

describe('FEATURE: path containment', () => {
  describe('GIVEN a boundary dir', () => {
    it('WHEN the dir is the boundary itself or below it THEN it is within', () => {
      expect(isWithin(BOUNDARY, BOUNDARY)).toBe(true);
      expect(isWithin(BOUNDARY, join(BOUNDARY, '.pnpm', 'node_modules'))).toBe(true);
    });

    it('WHEN the dir is a parent or a sibling THEN it is not within', () => {
      expect(isWithin(BOUNDARY, join(BOUNDARY, '..', '..', 'node_modules'))).toBe(false);
      expect(isWithin(BOUNDARY, join(BOUNDARY, '..', 'other'))).toBe(false);
    });

    it('WHEN a child name merely starts with two dots THEN it is within', () => {
      expect(isWithin(BOUNDARY, join(BOUNDARY, '..hidden'))).toBe(true);
    });
  });
});
