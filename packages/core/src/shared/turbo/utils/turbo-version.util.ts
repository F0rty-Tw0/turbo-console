import type { TurboVersionRange } from '../common/turbo.type.ts';

const VERSION_PART = /^\d+$/;

const isVersionPart = (part: string): boolean => {
  return VERSION_PART.test(part);
};

const parseVersion = (version: string): number[] | null => {
  const parts = version.split('.');
  const isNumeric = parts.every(isVersionPart);
  const isRelease = parts.length === 3 && isNumeric;

  if (!isRelease) return null;

  return parts.map(Number);
};

const compareVersions = (left: number[], right: number[]): number => {
  for (const [index, part] of left.entries()) {
    const difference = part - (right[index] ?? 0);

    if (difference !== 0) return difference;
  }

  return 0;
};

/**
 * True when `version` is a plain `major.minor.patch` release inside `range`. Prereleases (`2.11.7-canary.1`), build
 * metadata and any other shape are unsupported and return false, as does a range whose bounds do not parse.
 */
export const isSupportedTurboVersion = (version: string, range: TurboVersionRange): boolean => {
  const parts = parseVersion(version);
  const min = parseVersion(range.min);
  const maxExclusive = parseVersion(range.maxExclusive);
  const isParsed = parts !== null && min !== null && maxExclusive !== null;

  if (!isParsed) return false;

  const isAtLeastMin = compareVersions(parts, min) >= 0;
  const isBelowMax = compareVersions(parts, maxExclusive) < 0;

  return isAtLeastMin && isBelowMax;
};
