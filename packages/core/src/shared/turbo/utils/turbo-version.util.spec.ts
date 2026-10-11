import { describe, expect, it } from 'vitest';

import { isSupportedTurboVersion } from './turbo-version.util.ts';
import { SUPPORTED_TURBO_RANGE } from '../common/turbo-version.const.ts';
import type { TurboVersionRange } from '../common/turbo.type.ts';

describe('FEATURE: supported turbo version check', () => {
  describe('GIVEN the supported range 2.11.7 up to 2.12.0', () => {
    it('WHEN the version is the range minimum THEN it is supported', () => {
      const isSupported = isSupportedTurboVersion('2.11.7', SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(true);
    });

    it('WHEN a later patch has a two-digit number THEN it is supported', () => {
      const isSupported = isSupportedTurboVersion('2.11.12', SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(true);
    });

    it('WHEN the version is one patch below the minimum THEN it is unsupported', () => {
      const isSupported = isSupportedTurboVersion('2.11.6', SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(false);
    });

    it('WHEN the version equals the exclusive maximum THEN it is unsupported', () => {
      const isSupported = isSupportedTurboVersion('2.12.0', SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(false);
    });

    it('WHEN the major version is higher THEN it is unsupported', () => {
      const isSupported = isSupportedTurboVersion('3.0.0', SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(false);
    });

    it('WHEN the version is a prerelease of the minimum THEN it is unsupported', () => {
      const isSupported = isSupportedTurboVersion('2.11.7-canary.1', SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(false);
    });

    it('WHEN the version has four parts THEN it is unsupported', () => {
      const isSupported = isSupportedTurboVersion('2.11.7.1', SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(false);
    });

    it('WHEN the version is not a version THEN it is unsupported', () => {
      const isSupported = isSupportedTurboVersion('garbage', SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(false);
    });
  });

  describe('GIVEN a range whose bound is not a version', () => {
    it('WHEN a version is checked THEN it is unsupported', () => {
      const range: TurboVersionRange = { min: '2.11.7', maxExclusive: 'latest' };

      const isSupported = isSupportedTurboVersion('2.11.7', range);

      expect(isSupported).toBe(false);
    });
  });
});
