import type { PackageManagerSource } from '@turbo-console/core';

/** Where the package manager came from, in one wording for the Output line and the group tooltip. */
export const sourceText = (source: PackageManagerSource): string => {
  if (source.kind === 'lockfile') return `(from ${source.file})`;

  if (source.kind === 'field') return '(from packageManager)';

  return source.kind === 'devEngines' ? '(from devEngines)' : '(default)';
};
