import { vi } from 'vitest';

import type { PanelFake, PanelFakes, UriFake, WebviewFake, WebviewUriFake } from '../common/vscode-fakes.type.ts';
import { CSP_SOURCE_STUB } from '../stubs/csp-source.stub.ts';

/** A webview panel whose html assignments, messages and listeners the spec reads back; every method a spy. */
export const webviewPanelMock = (): PanelFakes => {
  const state = { visible: true };
  const assigned: string[] = [];
  const uriText = (uri: UriFake): WebviewUriFake => {
    const text: WebviewUriFake = { toString: () => `webview:${uri.fsPath}` };

    return text;
  };
  const webview: WebviewFake = {
    get html(): string {
      return assigned.at(-1) ?? '';
    },
    set html(value: string) {
      assigned.push(value);
    },
    cspSource: CSP_SOURCE_STUB,
    asWebviewUri: vi.fn(uriText),
    postMessage: vi.fn(async () => Promise.resolve(true)),
    onDidReceiveMessage: vi.fn()
  };
  const fake: PanelFake = {
    get visible(): boolean {
      return state.visible;
    },
    assigned,
    webview,
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidChangeViewState: vi.fn(),
    onDidDispose: vi.fn()
  };
  const show = (visible: boolean): void => {
    state.visible = visible;
  };
  const fakes: PanelFakes = { fake, show };

  return fakes;
};
