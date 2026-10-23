import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { graphCsp } from '@turbo-console/webview-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as vscode from 'vscode';

import { editorGraphHost } from './graph-ports.ts';
import { pickSaveUri, showError, showInfo, writeBytes } from './graph-save-ports.ts';
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

type ShowTextDocument = (file: UriFake, options: unknown) => Promise<void>;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `graph-ports.ts` makes. */
const editor = vi.hoisted(() => {
  const spies = { createWebviewPanel: vi.fn<CreatePanel>(), showTextDocument: vi.fn<ShowTextDocument>() };

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
  const window = { createWebviewPanel: editor.createWebviewPanel, showTextDocument: editor.showTextDocument };
  const uri = { joinPath, file };
  const viewColumn = { Active: -1, Beside: -2 };

  class Position {
    public readonly line: number;
    public readonly character: number;

    public constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }
  }

  class Range {
    public readonly start: Position;
    public readonly end: Position;

    public constructor(start: Position, end: Position) {
      this.start = start;
      this.end = end;
    }
  }

  const module = { Uri: uri, ViewColumn: viewColumn, window, Position, Range };

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

    it('WHEN it opens THEN the asked URIs are main.js, graph.css, then codicon.css in the page folder', () => {
      host.open('t');

      const { asWebviewUri } = panelAt(made, 0).fake.webview;
      const asked = asWebviewUri.mock.calls.map((call) => call[0].fsPath);

      expect(asked).toStrictEqual([`${assetDir}/main.js`, `${assetDir}/graph.css`, `${assetDir}/codicon.css`]);
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

  describe('GIVEN the save ports', () => {
    it('WHEN the host is built THEN its save members are the graph-save-ports functions', () => {
      const saves = [host.pickSaveUri, host.writeBytes, host.showInfo, host.showError];

      expect(saves).toStrictEqual([pickSaveUri, writeBytes, showInfo, showError]);
    });
  });

  describe('GIVEN a file to open at a line', () => {
    it('WHEN openAt is called THEN the file opens beside the graph with the cursor at the line, column 0', async () => {
      await host.openAt('/ws/apps/web/package.json', 7);

      const cursor = { line: 7, character: 0 };
      const selection = { start: cursor, end: cursor };
      const options = { selection, viewColumn: -2 };

      expect(editor.showTextDocument).toHaveBeenCalledExactlyOnceWith({ fsPath: '/ws/apps/web/package.json' }, options);
    });
  });

  describe('GIVEN a file to read', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'graph-read-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('WHEN readText reads a small file THEN it returns its text', async () => {
      const file = join(dir, 'package.json');

      writeFileSync(file, '{"name":"web"}');

      const text = await host.readText(file);

      expect(text).toBe('{"name":"web"}');
    });

    it('WHEN the file is over 1 MiB THEN readText returns null', async () => {
      const file = join(dir, 'big.json');

      writeFileSync(file, 'x'.repeat(1024 * 1024 + 1));

      const text = await host.readText(file);

      expect(text).toBeNull();
    });

    it('WHEN the file is missing THEN readText rejects', async () => {
      const missing = host.readText(join(dir, 'none.json'));

      await expect(missing).rejects.toThrow('ENOENT');
    });
  });

  describe('GIVEN the layout cache', () => {
    it('WHEN a flat entry is written THEN workspaceState is updated once under the flat root key', () => {
      host.writeCache('/ws', 'flat', ENTRY);

      expect(spies.update).toHaveBeenCalledExactlyOnceWith('turboConsole.graphLayout:/ws', ENTRY);
    });

    it('WHEN a folders entry is written THEN workspaceState is updated once under the folders root key', () => {
      host.writeCache('/ws', 'folders', ENTRY);

      expect(spies.update).toHaveBeenCalledExactlyOnceWith('turboConsole.graphLayout.folders:/ws', ENTRY);
    });

    it('WHEN a valid flat entry was stored THEN it is read back from the flat key', () => {
      spies.get.mockReturnValue(ENTRY);

      const entry = host.readCache('/ws', 'flat');

      expect(entry).toStrictEqual(ENTRY);
      expect(spies.get).toHaveBeenCalledExactlyOnceWith('turboConsole.graphLayout:/ws');
    });

    it('WHEN a valid folders entry was stored THEN it is read back from the folders key', () => {
      spies.get.mockReturnValue(ENTRY);

      const entry = host.readCache('/ws', 'folders');

      expect(entry).toStrictEqual(ENTRY);
      expect(spies.get).toHaveBeenCalledExactlyOnceWith('turboConsole.graphLayout.folders:/ws');
    });

    it('WHEN the memento holds garbage THEN the read is null', () => {
      spies.get.mockReturnValue('x');

      expect(host.readCache('/ws', 'flat')).toBeNull();
    });

    it('WHEN the memento holds garbage under the folders key THEN the read is null', () => {
      spies.get.mockReturnValue('x');

      expect(host.readCache('/ws', 'folders')).toBeNull();
    });

    it('WHEN the update rejects THEN the failure is logged through output.error and the write does not throw', async () => {
      spies.update.mockRejectedValue(new Error('quota'));

      expect(() => {
        host.writeCache('/ws', 'flat', ENTRY);
      }).not.toThrow();
      await vi.waitFor(() => {
        expect(output.error).toHaveBeenCalledOnce();
      });

      expect(vi.mocked(output.error).mock.calls[0]?.[0]).toContain('quota');
    });

    it('WHEN the folders update rejects THEN the failure is logged through output.error and the write does not throw', async () => {
      spies.update.mockRejectedValue(new Error('quota'));

      expect(() => {
        host.writeCache('/ws', 'folders', ENTRY);
      }).not.toThrow();
      await vi.waitFor(() => {
        expect(output.error).toHaveBeenCalledOnce();
      });

      expect(vi.mocked(output.error).mock.calls[0]?.[0]).toContain('quota');
    });
  });
});
