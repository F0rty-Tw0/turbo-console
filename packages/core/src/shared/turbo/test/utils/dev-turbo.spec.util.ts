import { createRequire } from 'node:module';

import { turboBinaryCandidates } from '../../utils/turbo-platform.util.ts';

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

/** Core's own dev turbo native binary, resolved from the `turbo` package; throws when this platform has none installed. */
export const devTurboPath = (): string => {
  const turboManifest = createRequire(import.meta.url).resolve('turbo/package.json');
  const candidates = turboBinaryCandidates(process.platform, process.arch);
  const found = resolveFirst(createRequire(turboManifest), candidates);

  if (found === null) throw new Error(`no native turbo binary for ${process.platform}-${process.arch}`);

  return found;
};
