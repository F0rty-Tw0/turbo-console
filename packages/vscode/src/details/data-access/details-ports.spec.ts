import { webviewCsp } from '@turbo-console/webview-ui';
import type { RunStateMessage, RunView } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as vscode from 'vscode';

import { editorPanelHost } from './details-ports.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { DETAILS_VIEW_TYPE } from '../common/details.const.ts';
import type { PanelHost, PanelView } from '../common/panel.type.ts';
import type { PageRoot } from '../test/common/page-root.type.ts';
import type { PanelFake, PanelFakes, UriFake } from '../test/common/vscode-fakes.type.ts';
import { webviewPanelMock } from '../test/mocks/webview-panel.mock.ts';
import { CSP_SOURCE_STUB } from '../test/stubs/csp-source.stub.ts';
import { copyPageRoot } from '../test/utils/page-root.spec.util.ts';

type CreatePanel = (viewType: string, title: string, column: number, options: unknown) => PanelFake;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `details-ports.ts` makes. */
const editor = vi.hoisted(() => {
  const spies = {
    createWebviewPanel: vi.fn<CreatePanel>(),
    executeCommand: vi.fn<(command: string, arg: unknown) => Promise<void>>(),
    showInformationMessage: vi.fn<(text: string) => void>(),
    showErrorMessage: vi.fn<(text: string) => void>()
  };

  return spies;
});

vi.mock('vscode', () => {
  const joinPath = (base: UriFake, ...parts: string[]): UriFake => {
    const segments = [base.fsPath, ...parts];
    const joined: UriFake = { fsPath: segments.join('/') };

    return joined;
  };
  const file = (fsPath: string): UriFake => {
    const uri: UriFake = { fsPath };

    return uri;
  };
  const window = {
    createWebviewPanel: editor.createWebviewPanel,
    showInformationMessage: editor.showInformationMessage,
    showErrorMessage: editor.showErrorMessage
  };
  const commands = { executeCommand: editor.executeCommand };
  const uri = { joinPath, file };
  const viewColumn = { Active: -1 };
  const module = { Uri: uri, ViewColumn: viewColumn, window, commands };

  return module;
});

const SCRIPT_NONCE = /<script nonce="([^"]+)"/;
const RUN_VIEW_STUB: RunView = { iconId: 'tools', colorVar: null, text: '', isRunning: false };
const MESSAGE: RunStateMessage = { type: 'runState', taskId: 'a#build', run: RUN_VIEW_STUB };

const rootOf = (file: string): string | null => {
  const isInWorkspace = file.startsWith('/ws/');

  if (!isInWorkspace) return null;

  return '/ws';
};

const panelAt = (made: PanelFakes[], index: number): PanelFakes => {
  const fakes = made[index];

  if (fakes === undefined) throw new Error(`panel ${index} was not created`);

  return fakes;
};

const listenerOf = <TListener>(registration: Mock<(listener: TListener) => void>): TListener => {
  const [listener] = registration.mock.calls[0] ?? [];

  if (listener === undefined) throw new Error('no listener was registered');

  return listener;
};

const nonceOf = (fakes: PanelFakes): string => {
  const { html } = fakes.fake.webview;
  const [, nonce = ''] = SCRIPT_NONCE.exec(html) ?? [];

  return nonce;
};

describe('FEATURE: the editor effects of Package Details', () => {
  let page: PageRoot;
  let output: Output;
  let host: PanelHost;
  let made: PanelFakes[];
  let assetDir: string;

  beforeEach(() => {
    page = copyPageRoot();
    assetDir = `${page.root}/dist/webview/details`;
    made = [];
    output = { error: vi.fn(), warn: vi.fn(), show: vi.fn(), dispose: vi.fn() };
    editor.createWebviewPanel.mockImplementation(() => {
      const fakes = webviewPanelMock();

      made.push(fakes);

      return fakes.fake;
    });
    host = editorPanelHost(vscode.Uri.file(page.root), output, rootOf);
  });

  afterEach(() => {
    page.dispose();
    vi.clearAllMocks();
  });

  describe('GIVEN a panel is opened', () => {
    it('WHEN it opens THEN scripts are on and the page folder is the only resource root, with no command URIs', () => {
      host.open('Package Details: a');

      const [viewType, title, column, options] = editor.createWebviewPanel.mock.calls[0] ?? [];

      expect(viewType).toBe(DETAILS_VIEW_TYPE);
      expect(title).toBe('Package Details: a');
      expect(column).toBe(-1);
      const roots = [{ fsPath: assetDir }];

      expect(options).toStrictEqual({
        enableScripts: true,
        enableForms: false,
        localResourceRoots: roots,
        retainContextWhenHidden: false
      });
    });

    it('WHEN it opens THEN the csp carries a nonce that the script tag has too', () => {
      host.open('t');

      const nonce = nonceOf(panelAt(made, 0));
      const html = panelAt(made, 0).fake.assigned[0];

      expect(nonce).not.toBe('');
      expect(html).toContain(`content="${webviewCsp(nonce, CSP_SOURCE_STUB)}"`);
    });

    it('WHEN it opens THEN every file slot is the webview URI of a file in the page folder', () => {
      host.open('t');

      const { asWebviewUri } = panelAt(made, 0).fake.webview;
      const asked = asWebviewUri.mock.calls.map((call) => call[0].fsPath);
      const html = panelAt(made, 0).fake.assigned[0];

      expect(asked).toStrictEqual([`${assetDir}/main.js`, `${assetDir}/details.css`, `${assetDir}/codicon.css`]);
      expect(html).toContain(`src="webview:${assetDir}/main.js"`);
    });

    it('WHEN two panels open THEN each gets its own nonce', () => {
      host.open('one');
      host.open('two');

      const first = nonceOf(panelAt(made, 0));
      const second = nonceOf(panelAt(made, 1));

      expect(first).not.toBe('');
      expect(first).not.toBe(second);
    });

    it('WHEN the page template cannot be read THEN the panel is disposed, given no html, and the error is thrown', () => {
      const missing = editorPanelHost(vscode.Uri.file('/no/such/extension'), output, rootOf);

      expect(() => missing.open('t')).toThrow('ENOENT');
      expect(panelAt(made, 0).fake.dispose).toHaveBeenCalledOnce();
      expect(panelAt(made, 0).fake.assigned).toStrictEqual([]);
    });
  });

  describe('GIVEN an opened view', () => {
    let view: PanelView;

    beforeEach(() => {
      view = host.open('t');
    });

    it('WHEN the panel hides THEN isVisible follows it', () => {
      panelAt(made, 0).show(false);

      expect(view.isVisible()).toBe(false);
    });

    it('WHEN it is revealed THEN the panel is revealed', () => {
      view.reveal();

      expect(panelAt(made, 0).fake.reveal).toHaveBeenCalledOnce();
    });

    it('WHEN a message is sent THEN the webview gets it and the result comes back', async () => {
      const sent = await view.send(MESSAGE);

      expect(panelAt(made, 0).fake.webview.postMessage).toHaveBeenCalledExactlyOnceWith(MESSAGE);
      expect(sent).toBe(true);
    });

    it('WHEN the page posts a message THEN the message listener hears its value', () => {
      const listener = vi.fn();

      view.onMessage(listener);
      listenerOf(panelAt(made, 0).fake.webview.onDidReceiveMessage)('from page');

      expect(listener).toHaveBeenCalledExactlyOnceWith('from page');
    });

    it('WHEN the view state changes THEN the view-state listener is called', () => {
      const listener = vi.fn();

      view.onViewState(listener);
      listenerOf(panelAt(made, 0).fake.onDidChangeViewState)();

      expect(listener).toHaveBeenCalledOnce();
    });

    it('WHEN the panel is disposed by the user THEN the dispose listener is called', () => {
      const listener = vi.fn();

      view.onDispose(listener);
      listenerOf(panelAt(made, 0).fake.onDidDispose)();

      expect(listener).toHaveBeenCalledOnce();
    });

    it('WHEN the view is disposed THEN the panel is', () => {
      view.dispose();

      expect(panelAt(made, 0).fake.dispose).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN the host effects', () => {
    it('WHEN a command executes THEN the editor runs it with the argument', async () => {
      editor.executeCommand.mockResolvedValue(undefined);

      await host.execute('turboConsole.runTask', { kind: 'task' });

      expect(editor.executeCommand).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', { kind: 'task' });
    });

    it('WHEN info and error texts show THEN they go to the matching editor notifications', () => {
      host.info('an info');
      host.error('an error');

      expect(editor.showInformationMessage).toHaveBeenCalledExactlyOnceWith('an info');
      expect(editor.showErrorMessage).toHaveBeenCalledExactlyOnceWith('an error');
    });

    it('WHEN a line is logged THEN it goes to the output channel', () => {
      host.log('a line');

      expect(output.error).toHaveBeenCalledExactlyOnceWith('a line');
    });

    it('WHEN a file is looked up THEN the given folder lookup answers', () => {
      expect(host.rootOf('/ws/a/package.json')).toBe('/ws');
      expect(host.rootOf('/elsewhere/package.json')).toBeNull();
    });
  });
});
