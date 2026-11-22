import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import {
  IMPORT_LIMITS,
  MANIFEST_FILE_MAX,
  MODULE_FILES_MAX,
  MODULE_LINKS_MAX,
  MODULE_STUB_NAME_MAX
} from '../../bridge/common/graph-message.const.ts';
import type { ModuleLink } from '../../bridge/common/graph-modules.type.ts';
import { isCount } from '../../bridge/utils/number.util.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { isShortString, isString } from '../../bridge/utils/string.util.ts';

const isLimit = (limit: unknown): boolean => limit === null || (isString(limit) && Object.hasOwn(IMPORT_LIMITS, limit));

const isPath = (file: unknown): boolean => isShortString(file, MANIFEST_FILE_MAX);

const isStubName = (stub: unknown): boolean => isShortString(stub, MODULE_STUB_NAME_MAX);

const isFiles = (files: unknown): files is unknown[] => Array.isArray(files) && files.length <= MODULE_FILES_MAX && files.every(isPath);

const isStubs = (stubs: unknown): stubs is unknown[] => Array.isArray(stubs) && stubs.every(isStubName);

const isTests = (tests: unknown, fileCount: number): boolean => {
  if (!Array.isArray(tests)) return false;

  const isAscendingIndex = (test: unknown, index: number): boolean => {
    const previous: unknown = index === 0 ? -1 : tests[index - 1];

    return isCount(test) && test < fileCount && typeof previous === 'number' && test > previous;
  };

  return tests.every(isAscendingIndex);
};

const isLinkShape = (link: unknown): link is ModuleLink => Array.isArray(link) && link.length === 5 && link.every(isCount);

const isLinkInto = (link: unknown, fromCount: number, toCount: number): boolean => {
  if (!isLinkShape(link)) return false;

  const [from, to] = link;

  return from < fromCount && to < toCount;
};

const isLinks = (links: unknown[], fromCount: number, toCount: number): boolean => {
  const isLink = (link: unknown): boolean => isLinkInto(link, fromCount, toCount);

  return links.every(isLink);
};

const isCounts = (counts: unknown): boolean => {
  if (!isRecord(counts)) return false;

  const { unresolved, external, assets, self } = counts;

  return isCount(unresolved) && isCount(external) && isCount(assets) && isCount(self);
};

const isTallies = (result: UnknownRecord): boolean => {
  const { counts, scanned, skipped, dropped, limit } = result;
  const areNumbers = isCount(scanned) && isCount(skipped) && isCount(dropped);

  return areNumbers && isCounts(counts) && isLimit(limit);
};

const isFound = (result: UnknownRecord): boolean => {
  const { files, tests, stubs, fileLinks, stubLinks } = result;
  const areListsFit = isFiles(files) && isStubs(stubs);

  if (!areListsFit || !Array.isArray(fileLinks) || !Array.isArray(stubLinks)) return false;

  if (fileLinks.length + stubLinks.length > MODULE_LINKS_MAX) return false;

  const areLinksFit = isLinks(fileLinks, files.length, files.length) && isLinks(stubLinks, files.length, stubs.length);

  return isTests(tests, files.length) && areLinksFit && isTallies(result);
};

const isResult = (result: unknown): boolean => {
  if (!isRecord(result)) return false;

  if (result['kind'] === 'failed') return true;

  return result['kind'] === 'found' && isFound(result);
};

/** Whether the whole `packageModules` record has its package name and a result whose every index, count and cap the page can trust (spec §5). */
export const isPackageModules = (value: UnknownRecord): boolean => {
  const { packageName, result } = value;

  return isString(packageName) && isResult(result);
};
