import { beforeEach, describe, expect, it, vi } from 'vitest';

import { moduleSitesOf } from './module-sites.util.ts';
import type * as targetModule from './module-target.util.ts';
import { SRC_A_DIR } from '../test/common/module-dirs.const.ts';
import { dirEndOf, fileEndOf, queryOf, sitesInputOf } from '../test/utils/module-sites.spec.util.ts';

const memoTargetOf = vi.hoisted(() => vi.fn<typeof targetModule.memoTargetOf>());

/** Spies on every resolve while keeping the real memo, so the count is the number of imports walked. */
vi.mock('./module-target.util.ts', async (importOriginal) => {
  const real = await importOriginal<typeof targetModule>();

  memoTargetOf.mockImplementation(real.memoTargetOf);

  const mocked = { ...real, memoTargetOf };

  return mocked;
});

const SITES_INPUT = sitesInputOf();

describe('FEATURE: a link query resolves only the imports of files its from end holds', () => {
  describe('GIVEN the shared fixture, whose 13 imports include 7 in files under src/a', () => {
    beforeEach(() => {
      memoTargetOf.mockClear();
    });

    it('WHEN the link (dir src/a, file src/lib/c.ts) is asked THEN only the 7 imports of files under src/a are resolved', () => {
      moduleSitesOf(SITES_INPUT, queryOf(dirEndOf('src/a'), fileEndOf('src/lib/c.ts')));

      const fromDirs = memoTargetOf.mock.calls.map(([, , fromDir]) => fromDir);

      expect(fromDirs).toStrictEqual(Array.from({ length: 7 }, () => SRC_A_DIR));
    });

    it('WHEN (file src/a/x.ts, null) is asked THEN all 13 imports are resolved', () => {
      moduleSitesOf(SITES_INPUT, queryOf(fileEndOf('src/a/x.ts'), null));

      expect(memoTargetOf).toHaveBeenCalledTimes(13);
    });
  });
});
