import { assertRunExtras } from '@turbo-console/core';
import type { PackageManagerName } from '@turbo-console/core';

/**
 * Spec §5: the argv of `<manager> run <script> [-- ] <args>`. Only npm needs the `--` to stop at its own flags; pnpm,
 * yarn and bun forward the args after the script name. bun and yarn berry are verified by docs only, untested. The args
 * reach a real shell, so core's `assertRunExtras` runs first and throws `invalid-argument` on an unsafe one.
 */
export const scriptArgsOf = (manager: PackageManagerName, scriptName: string, passThrough: string[]): string[] => {
  assertRunExtras({ passThrough });

  const base = ['run', scriptName];

  if (passThrough.length === 0) return base;

  if (manager === 'npm') return [...base, '--', ...passThrough];

  return [...base, ...passThrough];
};
