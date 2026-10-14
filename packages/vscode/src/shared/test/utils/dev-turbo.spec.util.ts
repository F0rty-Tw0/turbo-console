import { createRequire } from 'node:module';

const PLATFORMS: Record<string, string> = { darwin: 'darwin', linux: 'linux', android: 'linux', win32: 'windows' };

const ARCHS: Record<string, string> = { x64: '64', arm64: 'arm64' };

/** Own keys only, so `constructor` and other `Object.prototype` keys find nothing. */
const ownValue = (table: Record<string, string>, key: string): string | undefined => {
  const isOwn = Object.hasOwn(table, key);
  const value = table[key];

  return isOwn ? value : undefined;
};

/**
 * Copy of core's `turboBinaryCandidates` (core does not export it): the native turbo binary module paths for a Node
 * platform and arch, scoped package first; `[]` when turbo ships none.
 */
const turboBinaryCandidates = (platform: string, arch: string): string[] => {
  const os = ownValue(PLATFORMS, platform);
  const cpu = ownValue(ARCHS, arch);

  if (os === undefined || cpu === undefined) return [];

  const ext = os === 'windows' ? '.exe' : '';

  return [`@turbo/${os}-${cpu}/bin/turbo${ext}`, `turbo-${os}-${cpu}/bin/turbo${ext}`];
};

const resolveFirst = (require: NodeJS.Require, candidates: string[]): string | null => {
  for (const candidate of candidates) {
    try {
      return require.resolve(candidate);
    } catch {
      continue;
    }
  }

  return null;
};

/** This package's dev turbo native binary, resolved from the `turbo` devDependency; throws when this platform has none. */
export const devTurboPath = (): string => {
  const turboManifest = createRequire(import.meta.url).resolve('turbo/package.json');
  const candidates = turboBinaryCandidates(process.platform, process.arch);
  const found = resolveFirst(createRequire(turboManifest), candidates);

  if (found === null) throw new Error(`no native turbo binary for ${process.platform}-${process.arch}`);

  return found;
};
