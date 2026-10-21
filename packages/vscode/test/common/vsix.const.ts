/** Every file under it must be in `WEBVIEW_FILES`: `.vscodeignore` ships the whole folder. */
export const WEBVIEW_DIR = 'dist/webview/';

const DETAILS_DIR = `${WEBVIEW_DIR}details/`;

const REQUIRED_DETAILS_NAMES = [
  'index.html',
  'main.js',
  'details.css',
  'codicon.css',
  'codicon.ttf',
  'LICENSE',
  'tool-icons.ttf',
  'tool-icons.css',
  'TOOL-ICONS-NOTICE.md'
];

const REQUIRED_DETAILS_FILES = REQUIRED_DETAILS_NAMES.map((name) => `${DETAILS_DIR}${name}`);

const GRAPH_DIR = `${WEBVIEW_DIR}graph/`;

const REQUIRED_GRAPH_NAMES = ['index.html', 'main.js'];

const REQUIRED_GRAPH_FILES = REQUIRED_GRAPH_NAMES.map((name) => `${GRAPH_DIR}${name}`);

export const REQUIRED_FILES = ['dist/extension.cjs', ...REQUIRED_DETAILS_FILES, ...REQUIRED_GRAPH_FILES];

export const WEBVIEW_FILES = [
  ...REQUIRED_DETAILS_FILES,
  ...REQUIRED_GRAPH_FILES,
  `${DETAILS_DIR}LICENSE-CODE`,
  `${DETAILS_DIR}SIMPLE-ICONS-LICENSE.md`,
  `${DETAILS_DIR}SIMPLE-ICONS-DISCLAIMER.md`
];

export const VSIX_FILES_PATH = '.vsix/files.txt';
