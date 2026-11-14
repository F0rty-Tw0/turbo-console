import { VSIX_PATH } from './common/vsix.const.ts';

/** The vsce args for `package`; `VSCE_PRE_RELEASE=1` marks the build as a Marketplace pre-release. */
export const packageArgs = (env: NodeJS.ProcessEnv): string[] => {
  const args = ['package', '--no-dependencies', '--out', VSIX_PATH];
  const isPreRelease = env['VSCE_PRE_RELEASE'] === '1';

  if (isPreRelease) args.push('--pre-release');

  return args;
};

/** The trimmed, non-empty lines of the file list `vsce ls` prints. */
export const listingFiles = (listing: string): string[] => {
  const lines = listing.split('\n');
  const trimmed = lines.map((line) => line.trim());

  return trimmed.filter((line) => line !== '');
};
