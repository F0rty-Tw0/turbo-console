import { createBridge } from '../bridge/data-access/create-bridge.ts';

const readyMarker = document.createElement('div');

readyMarker.dataset['testid'] = 'webview-ui-ready';
readyMarker.textContent = 'Turbo Console graph ready';
document.body.append(readyMarker);

createBridge().ready();
