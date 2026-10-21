import { graphCsp } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as vscode from 'vscode';

import { editorGraphHost } from './graph-ports.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { PageRoot } from '../../shared/test/common/page-root.type.ts';
import type { PanelFake, PanelFakes, UriFake } from '../../shared/test/common/vscode-fakes.type.ts';
import { webviewPanelMock } from '../../shared/test/mocks/webview-panel.mock.ts';
import { CSP_SOURCE_STUB } from '../../shared/test/stubs/csp-source.stub.ts';
import type { GraphHost, GraphStore } from '../common/graph-panel.type.ts';
import { GRAPH_VIEW_TYPE } from '../common/graph.const.ts';
import { GRAPH_HASH_STUB, POSITIONS_STUB } from '../test/stubs/graph-model.stub.ts';
import { copyGraphPageRoot } from '../test/utils/page-root.spec.util.ts';

type CreatePanel = (viewType: string, title: string, column: number, options: unknown) => PanelFake;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `graph-ports.ts` makes. */
const editor = vi.hoisted(() => {
  const spies = { createWebviewPanel: vi.fn<CreatePanel>() };

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
  const window = { createWebviewPanel: editor.createWebviewPanel };
  const uri = { joinPath, file };
  const viewColumn = { Active: -1 };
  const module = { Uri: uri, ViewColumn: viewColumn, window };

  return module;
});

const ENTRY = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB };
const SCRIPT_NONCE = /<script nonce="([^"]+)"/;

type StoreSpies = {
  readonly store: GraphStore;
  readonly get: Mock<GraphStore['get']>;
  readonly update: Mock<GraphStore['update']>;
};

const storeMock = (): StoreSpies => {
  const get = vi.fn<GraphStore['get']>();
  const update = vi.fn<GraphStore['update']>().mockResolvedValue(undefined);
  const store: GraphStore = { get, update };
  const spies: StoreSpies = { store, get, update };

  return spies;
};

const nonceOf = (fakes: PanelFakes): string => {
  const [, nonce = ''] = SCRIPT_NONCE.exec(fakes.fake.webview.html) ?? [];

  return nonce;
};

const panelAt = (made: PanelFakes[], index: number): PanelFakes => {
  const fakes = made[index];

  if (fakes === undefined) throw new Error(`panel ${index} was not created`);

  return fakes;
};

describe('FEATURE: the editor effects of the Package Graph', () => {
  let page: PageRoot;
  let output: Output;
  let spies: StoreSpies;
  let host: GraphHost;
  let made: PanelFakes[];
  let assetDir: string;

  beforeEach(() => {
    page = copyGraphPageRoot();
    assetDir = `${page.root}/dist/webview/graph`;
    made = [];
    output = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn(), dispose: vi.fn() };
    spies = storeMock();
    const createPanel = (): PanelFake => {
      const fakes = webviewPanelMock();

      made.push(fakes);

      return fakes.fake;
    };

    editor.createWebviewPanel.mockImplementation(createPanel);
    host = editorGraphHost(vscode.Uri.file(page.root), output, spies.store);
  });

  afterEach(() => {
    page.dispose();
    vi.clearAllMocks();
  });

  describe('GIVEN a panel is opened', () => {
    it('WHEN it opens THEN it is the graph view with scripts on and the graph page folder as the only resource root', () => {
      host.open('Package Graph — ws');

      const [viewType, title, column, options] = editor.createWebviewPanel.mock.calls[0] ?? [];

      expect(viewType).toBe(GRAPH_VIEW_TYPE);
      expect(title).toBe('Package Graph — ws');
      expect(column).toBe(-1);
      const resourceRoots = [{ fsPath: assetDir }];

      expect(options).toStrictEqual({
        enableScripts: true,
        enableForms: false,
        localResourceRoots: resourceRoots,
        retainContextWhenHidden: false
      });
    });

    it('WHEN it opens THEN the csp is the graph csp for the nonce of the script tag', () => {
      host.open('t');

      const { html } = panelAt(made, 0).fake.webview;
      const nonce = nonceOf(panelAt(made, 0));
      const csp = graphCsp(nonce, CSP_SOURCE_STUB);

      expect(nonce).not.toBe('');
      expect(html).toContain(`content="${csp}"`);
    });

    it('WHEN it opens THEN the asked URIs are main.js then graph.css in the page folder', () => {
      host.open('t');

      const { asWebviewUri } = panelAt(made, 0).fake.webview;
      const asked = asWebviewUri.mock.calls.map((call) => call[0].fsPath);

      expect(asked).toStrictEqual([`${assetDir}/main.js`, `${assetDir}/graph.css`]);
    });

    it('WHEN the page template cannot be read THEN the panel is disposed, given no html, and the error is thrown', () => {
      const missing = editorGraphHost(vscode.Uri.file('/no/such/extension'), output, spies.store);

      expect(() => missing.open('t')).toThrow('ENOENT');
      expect(panelAt(made, 0).fake.dispose).toHaveBeenCalledOnce();
      expect(panelAt(made, 0).fake.assigned).toStrictEqual([]);
    });
  });

  describe('GIVEN the output channel', () => {
    it('WHEN the host logs an info line THEN it goes to output.info, not output.error', () => {
      host.info('graph layout elk 12 ms');

      expect(output.info).toHaveBeenCalledExactlyOnceWith('graph layout elk 12 ms');
      expect(output.error).not.toHaveBeenCalled();
    });

    it('WHEN the host logs a failure THEN it goes to output.error', () => {
      host.log('boom');

      expect(output.error).toHaveBeenCalledExactlyOnceWith('boom');
    });
  });

  describe('GIVEN the layout cache', () => {
    it('WHEN an entry is written THEN workspaceState is updated once under the root key', () => {
      host.writeCache('/ws', ENTRY);

      expect(spies.update).toHaveBeenCalledExactlyOnceWith('turboConsole.graphLayout:/ws', ENTRY);
    });

    it('WHEN a valid entry was stored THEN it is read back for that root', () => {
      spies.get.mockReturnValue(ENTRY);

      const entry = host.readCache('/ws');

      expect(entry).toStrictEqual(ENTRY);
      expect(spies.get).toHaveBeenCalledExactlyOnceWith('turboConsole.graphLayout:/ws');
    });

    it('WHEN the memento holds garbage THEN the read is null', () => {
      spies.get.mockReturnValue('x');

      expect(host.readCache('/ws')).toBeNull();
    });

    it('WHEN the update rejects THEN the failure is logged through output.error and the write does not throw', async () => {
      spies.update.mockRejectedValue(new Error('quota'));

      expect(() => {
        host.writeCache('/ws', ENTRY);
      }).not.toThrow();
      await vi.waitFor(() => {
        expect(output.error).toHaveBeenCalledOnce();
      });

      expect(vi.mocked(output.error).mock.calls[0]?.[0]).toContain('quota');
    });
  });
});
