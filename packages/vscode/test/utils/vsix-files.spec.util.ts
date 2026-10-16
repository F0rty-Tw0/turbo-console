import { REQUIRED_FILES, WEBVIEW_DIR, WEBVIEW_FILES } from '../common/vsix.const.ts';

/** Problems in the file list `vsce ls` prints for the package; empty when the `.vsix` holds exactly what ships. */
export const vsixProblems = (files: string[]): string[] => {
  const missing = REQUIRED_FILES.filter((required) => !files.includes(required));
  const missingProblems = missing.map((file) => `missing ${file}`);
  const sourceProblems = files.filter((file) => file.startsWith('src/')).map((file) => `source shipped: ${file}`);
  const mapProblems = files.filter((file) => file.endsWith('.map')).map((file) => `source map shipped: ${file}`);
  const strays = files.filter((file) => file.startsWith(WEBVIEW_DIR) && !file.endsWith('.map') && !WEBVIEW_FILES.includes(file));
  const strayProblems = strays.map((file) => `unexpected webview file: ${file}`);

  return [...missingProblems, ...sourceProblems, ...mapProblems, ...strayProblems];
};
