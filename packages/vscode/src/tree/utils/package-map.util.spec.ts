import { describe, expect, it } from 'vitest';

import { packageMapOf } from './package-map.util.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

describe('FEATURE: package map', () => {
  describe('GIVEN the packages of the stub model', () => {
    it('WHEN mapped THEN each package is found by its name', () => {
      const map = packageMapOf(WORKSPACE_MODEL_STUB.packages);

      expect(map.get('a')).toBe(WORKSPACE_MODEL_STUB.packages[1]);
      expect(map.size).toBe(3);
    });
  });

  describe('GIVEN no packages', () => {
    it('WHEN mapped THEN the map is empty', () => {
      const map = packageMapOf([]);

      expect(map.size).toBe(0);
    });
  });
});
