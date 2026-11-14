/* eslint-disable @typescript-eslint/naming-convention -- VSCE_PRE_RELEASE is an environment variable name */
import { describe, expect, it } from 'vitest';

import { VSIX_PATH } from './common/vsix.const.ts';
import { listingFiles, packageArgs } from './package.util.ts';

const BASE_ARGS = ['package', '--no-dependencies', '--out', VSIX_PATH];

describe('FEATURE: package util', () => {
  describe('GIVEN no VSCE_PRE_RELEASE', () => {
    it('WHEN packageArgs builds the args THEN there is no --pre-release', () => {
      const args = packageArgs({});

      expect(args).toStrictEqual(BASE_ARGS);
    });
  });

  describe('GIVEN VSCE_PRE_RELEASE=1', () => {
    it('WHEN packageArgs builds the args THEN --pre-release comes last', () => {
      const args = packageArgs({ VSCE_PRE_RELEASE: '1' });

      expect(args).toStrictEqual([...BASE_ARGS, '--pre-release']);
    });
  });

  describe('GIVEN VSCE_PRE_RELEASE=0', () => {
    it('WHEN packageArgs builds the args THEN there is no --pre-release', () => {
      const args = packageArgs({ VSCE_PRE_RELEASE: '0' });

      expect(args).toStrictEqual(BASE_ARGS);
    });
  });

  describe('GIVEN a listing with padding and blank lines', () => {
    it('WHEN listingFiles splits it THEN the trimmed non-empty lines remain', () => {
      const files = listingFiles('a\n  b \n\n');

      expect(files).toStrictEqual(['a', 'b']);
    });
  });
});
