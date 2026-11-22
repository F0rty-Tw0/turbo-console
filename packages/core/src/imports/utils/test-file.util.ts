import { TEST_DIR_NAMES, TEST_FILE_SUFFIX } from '../common/import-scan.const.ts';

/** True when `path` (posix, relative to the package dir) has a test suffix or sits under a test dir at any depth. */
export const isTestFile = (path: string): boolean => {
  const segments = path.split('/');
  const name = segments.pop() ?? '';
  const isTestName = TEST_FILE_SUFFIX.test(name);
  const isInTestDir = segments.some((segment) => TEST_DIR_NAMES.has(segment));

  return isTestName || isInTestDir;
};
