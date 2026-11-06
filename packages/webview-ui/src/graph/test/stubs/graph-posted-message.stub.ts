import type { GraphWebviewMessage } from '../../../bridge/common/graph-message.type.ts';

/** The `scanImports` the page posts when the link `web` to `ui` is shown. */
export const SCAN_WEB_TO_UI_STUB: GraphWebviewMessage = { type: 'scanImports', source: 'web', target: 'ui' };
