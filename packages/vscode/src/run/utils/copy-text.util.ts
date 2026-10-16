import { SCRIPT_COPIED_ROOT_TEXT } from '../common/copy.const.ts';

/** `packagePath` is the package's path under the repo root; `.` or an empty one is the root package. The backticks are literal. */
export const scriptCopiedText = (packagePath: string): string => {
  const isRootPackage = packagePath === '.' || packagePath === '';

  if (isRootPackage) return SCRIPT_COPIED_ROOT_TEXT;

  return `Copied. Run it in \`${packagePath}\`.`;
};
