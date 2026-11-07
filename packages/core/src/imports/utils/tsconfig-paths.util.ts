import { resolve } from 'node:path';

import type { TsconfigPaths } from '../common/import-scan.type.ts';
import type { TsconfigLink } from '../common/tsconfig.type.ts';

const setsPaths = (link: TsconfigLink): boolean => link.file.paths !== undefined;

const setsBaseUrl = (link: TsconfigLink): boolean => link.file.baseUrl !== undefined;

const baseUrlOf = (baseLink: TsconfigLink | undefined, pathsLink: TsconfigLink): string => {
  if (baseLink?.file.baseUrl === undefined) return pathsLink.dir;

  return resolve(baseLink.dir, baseLink.file.baseUrl);
};

/**
 * The effective `paths` of a chain in precedence order, nearest first (D6, TS): the first link that sets `paths` gives
 * them; `baseUrl` is the first link that sets `baseUrl`, resolved against that link's dir, else the `paths` link's dir.
 * `null` when no link sets `paths`, the nearest sets `null`, or it holds no pattern.
 */
export const tsconfigPathsOf = (links: TsconfigLink[]): TsconfigPaths | null => {
  const pathsLink = links.find(setsPaths);
  const paths = pathsLink?.file.paths;

  if (pathsLink === undefined || !paths) return null;

  const patterns = Object.keys(paths);

  if (patterns.length === 0) return null;

  const baseLink = links.find(setsBaseUrl);
  const baseUrl = baseUrlOf(baseLink, pathsLink);
  const effective: TsconfigPaths = { baseUrl, paths };

  return effective;
};
