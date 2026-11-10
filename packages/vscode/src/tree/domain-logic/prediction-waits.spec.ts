import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionWaits } from './prediction-waits.ts';
import { OTHER_ROOT, ROOT } from '../test/common/atom-load.const.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

const PKG_A = '@fx/a';
const PKG_B = '@fx/b';

describe('FEATURE: prediction waits', () => {
  let waits: PredictionWaits;

  beforeEach(() => {
    waits = new PredictionWaits();
  });

  describe('GIVEN a package waiting in a root', () => {
    beforeEach(() => {
      waits.add(ROOT, PKG_A);
    });

    it('WHEN its root is taken with a model that holds it THEN it comes back', () => {
      expect(waits.takeOf(ROOT, buildModelOf([PKG_A]))).toStrictEqual([PKG_A]);
    });

    it('WHEN its root is taken twice THEN the second take is empty', () => {
      waits.takeOf(ROOT, buildModelOf([PKG_A]));

      expect(waits.takeOf(ROOT, buildModelOf([PKG_A]))).toStrictEqual([]);
    });

    it('WHEN taken with a model that lacks it THEN nothing comes back', () => {
      expect(waits.takeOf(ROOT, buildModelOf([PKG_B]))).toStrictEqual([]);
    });

    it('WHEN taken with a model that lacks it THEN it is forgotten', () => {
      waits.takeOf(ROOT, buildModelOf([PKG_B]));

      expect(waits.takeOf(ROOT, buildModelOf([PKG_A]))).toStrictEqual([]);
    });

    it('WHEN taken with a null model THEN nothing comes back', () => {
      expect(waits.takeOf(ROOT, null)).toStrictEqual([]);
    });

    it('WHEN another root is taken THEN nothing comes back', () => {
      expect(waits.takeOf(OTHER_ROOT, buildModelOf([PKG_A]))).toStrictEqual([]);
    });

    it('WHEN another root is taken THEN its own root still gives it back', () => {
      waits.takeOf(OTHER_ROOT, buildModelOf([PKG_A]));

      expect(waits.takeOf(ROOT, buildModelOf([PKG_A]))).toStrictEqual([PKG_A]);
    });

    it('WHEN its root is not kept THEN a take is empty', () => {
      waits.keep(new Set([OTHER_ROOT]));

      expect(waits.takeOf(ROOT, buildModelOf([PKG_A]))).toStrictEqual([]);
    });

    it('WHEN its root is kept THEN a take gives it back', () => {
      waits.keep(new Set([ROOT]));

      expect(waits.takeOf(ROOT, buildModelOf([PKG_A]))).toStrictEqual([PKG_A]);
    });

    it('WHEN cleared THEN a take is empty', () => {
      waits.clear();

      expect(waits.takeOf(ROOT, buildModelOf([PKG_A]))).toStrictEqual([]);
    });
  });

  describe('GIVEN two packages waiting in one root', () => {
    it('WHEN the model holds both THEN both come back in insertion order', () => {
      waits.add(ROOT, PKG_A);
      waits.add(ROOT, PKG_B);

      expect(waits.takeOf(ROOT, buildModelOf([PKG_B, PKG_A]))).toStrictEqual([PKG_A, PKG_B]);
    });
  });
});
