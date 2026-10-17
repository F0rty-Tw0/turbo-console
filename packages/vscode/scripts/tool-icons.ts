import { join } from 'node:path';

import { buildToolIcons } from './tool-icons.util.ts';
import { TOOLS } from '../src/tool/common/tool.const.ts';

await buildToolIcons(TOOLS, join(import.meta.dirname, '../dist/webview/details'));
