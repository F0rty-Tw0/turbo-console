import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { panelViewOf } from './panel-view.ts';
import type { EditorPanelView } from '../common/panel-view.type.ts';
import type { PanelFake, PanelFakes } from '../test/common/vscode-fakes.type.ts';
import { webviewPanelMock } from '../test/mocks/webview-panel.mock.ts';

type Message = { readonly type: 'ping' };

type CreatePanel = (viewType: string, title: string, column: number, options: unknown) => PanelFake;

/** `vscode` exists only inside the editor, so the module is replaced here by the one call the spec makes. */
const editor = vi.hoisted(() => {
  const spies = { createWebviewPanel: vi.fn<CreatePanel>() };

  return spies;
});

vi.mock('vscode', () => {
  const window = { createWebviewPanel: editor.createWebviewPanel };
  const viewColumn = { Active: -1 };
  const module = { ViewColumn: viewColumn, window };

  return module;
});

describe('FEATURE: panelViewOf', () => {
  let fakes: PanelFakes;
  let view: EditorPanelView<Message>;

  beforeEach(() => {
    fakes = webviewPanelMock();
    editor.createWebviewPanel.mockReturnValue(fakes.fake);
    view = panelViewOf<Message>(vscode.window.createWebviewPanel('t', 't', vscode.ViewColumn.Active, {}));
  });

  describe('GIVEN a panel', () => {
    it('WHEN visibility is read THEN it follows the panel', () => {
      fakes.show(false);

      expect(view.isVisible()).toBe(false);
    });

    it('WHEN reveal is called THEN the panel is revealed', () => {
      view.reveal();

      expect(fakes.fake.reveal).toHaveBeenCalledTimes(1);
    });

    it('WHEN the title is set THEN the panel title changes', () => {
      view.setTitle('x');

      expect(fakes.fake.title).toBe('x');
    });

    it('WHEN a message is sent THEN the webview posts it', async () => {
      await view.send({ type: 'ping' });

      expect(fakes.fake.webview.postMessage).toHaveBeenCalledWith({ type: 'ping' });
    });

    it('WHEN a message listener is added THEN the webview registers it', () => {
      const listener = vi.fn();

      view.onMessage(listener);

      expect(fakes.fake.webview.onDidReceiveMessage).toHaveBeenCalledWith(listener);
    });

    it('WHEN a view-state listener is added THEN it runs with no arguments on a change', () => {
      const listener = vi.fn();

      view.onViewState(listener);
      const [registered = vi.fn()] = fakes.fake.onDidChangeViewState.mock.calls[0] ?? [];

      registered();

      expect(listener).toHaveBeenCalledWith();
    });

    it('WHEN a dispose listener is added THEN the panel registers it', () => {
      const listener = vi.fn();

      view.onDispose(listener);

      expect(fakes.fake.onDidDispose).toHaveBeenCalledWith(listener);
    });

    it('WHEN dispose is called THEN the panel is disposed', () => {
      view.dispose();

      expect(fakes.fake.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
