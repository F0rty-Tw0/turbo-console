/** Every file under it must be in `WEBVIEW_FILES`: `.vscodeignore` ships the whole folder. */
export const WEBVIEW_DIR = 'dist/webview/';

const DETAILS_DIR = `${WEBVIEW_DIR}details/`;

const REQUIRED_DETAILS_NAMES = ['index.html', 'main.js', 'details.css', 'codicon.css', 'codicon.ttf', 'LICENSE'];

const REQUIRED_DETAILS_FILES = REQUIRED_DETAILS_NAMES.map((name) => `${DETAILS_DIR}${name}`);

export const REQUIRED_FILES = ['dist/extension.cjs', ...REQUIRED_DETAILS_FILES];

export const WEBVIEW_FILES = [...REQUIRED_DETAILS_FILES, `${DETAILS_DIR}LICENSE-CODE`];

export const VSIX_FILES_PATH = '.vsix/files.txt';
