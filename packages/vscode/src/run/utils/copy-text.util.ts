import { DESCRIPTION_MAX } from '../../shared/common/text.const.ts';
import { toastText } from '../../shared/utils/link-safe.util.ts';
import { SCRIPT_COPIED_ROOT_TEXT } from '../common/copy.const.ts';

/**
 * `packagePath` is the package's path under the repo root; `.` or an empty one is the root package. The path is repo text,
 * so it is cleaned as the tree cleans it (`DESCRIPTION_MAX`) and holds no link. The backticks are literal.
 */
export const scriptCopiedText = (packagePath: string): string => {
  const isRootPackage = packagePath === '.' || packagePath === '';

  if (isRootPackage) return SCRIPT_COPIED_ROOT_TEXT;

  const shown = toastText(packagePath, DESCRIPTION_MAX);

  return `Copied. Run it in \`${shown}\`.`;
};
