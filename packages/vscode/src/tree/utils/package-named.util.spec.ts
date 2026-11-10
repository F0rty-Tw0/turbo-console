import { describe, expect, it } from 'vitest';

import { hasPackageNamed } from './package-named.util.ts';
import { PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

describe('FEATURE: package named in a model', () => {
  describe('GIVEN a model holding one package', () => {
    const model = buildModelOf([PKG_A]);

    it('WHEN its name is asked THEN it is held', () => {
      expect(hasPackageNamed(model, PKG_A)).toBe(true);
    });

    it('WHEN another name is asked THEN it is not held', () => {
      expect(hasPackageNamed(model, PKG_B)).toBe(false);
    });
  });

  describe('GIVEN no model', () => {
    it('WHEN a name is asked THEN it is not held', () => {
      expect(hasPackageNamed(null, PKG_A)).toBe(false);
    });
  });
});
