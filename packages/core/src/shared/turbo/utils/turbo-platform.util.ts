const PLATFORMS: Record<string, string> = { darwin: 'darwin', linux: 'linux', android: 'linux', win32: 'windows' };

const ARCHS: Record<string, string> = { x64: '64', arm64: 'arm64' };

/** Own keys only, so `constructor` and other `Object.prototype` keys find nothing. */
const ownValue = (table: Record<string, string>, key: string): string | undefined => {
  const isOwn = Object.hasOwn(table, key);
  const value = table[key];

  return isOwn ? value : undefined;
};

/**
 * Native turbo binary module paths for a Node platform and arch, scoped package first, as turbo's own launcher lists
 * them (`turbo/bin/turbo`); `[]` when turbo ships none. No arm64 → x64 fallback.
 */
export const turboBinaryCandidates = (platform: string, arch: string): string[] => {
  const os = ownValue(PLATFORMS, platform);
  const cpu = ownValue(ARCHS, arch);

  if (os === undefined || cpu === undefined) return [];

  const ext = os === 'windows' ? '.exe' : '';

  return [`@turbo/${os}-${cpu}/bin/turbo${ext}`, `turbo-${os}-${cpu}/bin/turbo${ext}`];
};
