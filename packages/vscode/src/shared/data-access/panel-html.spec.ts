import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as vscode from 'vscode';

import { setPanelHtml } from './panel-html.ts';
import type { HtmlAssets, HtmlBuilder } from '../common/html-assets.type.ts';
import type { PanelFake, PanelFakes, UriFake } from '../test/common/vscode-fakes.type.ts';
import { webviewPanelMock } from '../test/mocks/webview-panel.mock.ts';
import { CSP_SOURCE_STUB } from '../test/stubs/csp-source.stub.ts';

/** The arguments of one `HtmlBuilder` call. */
type BuildCall = [template: string, assets: HtmlAssets, nonce: string];

type CreatePanel = (viewType: string, title: string, column: number, options: unknown) => PanelFake;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `panel-html.ts` makes. */
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

const firstCallOf = (build: Mock<HtmlBuilder>): BuildCall => {
  const [call] = build.mock.calls;

  if (call === undefined) throw new Error('build was not called');

  return call;
};

describe('FEATURE: setPanelHtml', () => {
  let dir: string;
  let fakes: PanelFakes;
  let panel: vscode.WebviewPanel;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'panel-html-'));
    writeFileSync(join(dir, 'index.html'), 'T:{{nonce}}');
    fakes = webviewPanelMock();
    editor.createWebviewPanel.mockReturnValue(fakes.fake);
    panel = vscode.window.createWebviewPanel('t', 't', vscode.ViewColumn.Active, {});
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('GIVEN a page folder with an index.html', () => {
    it('WHEN the html is set THEN build gets the template, the webview assets and a 16-byte base64 nonce', () => {
      const build = vi.fn<HtmlBuilder>(() => 'built');

      setPanelHtml(panel, vscode.Uri.file(dir), build);

      const [template, assets, nonce] = firstCallOf(build);

      expect(template).toBe('T:{{nonce}}');
      expect(assets.cspSource).toBe(CSP_SOURCE_STUB);
      expect(assets.uriOf('main.js')).toBe(`webview:${dir}/main.js`);
      expect(Buffer.from(nonce, 'base64')).toHaveLength(16);
      expect(fakes.fake.assigned).toStrictEqual(['built']);
    });

    it('WHEN it is set twice THEN each build gets its own nonce', () => {
      const build = vi.fn<HtmlBuilder>(() => 'built');

      setPanelHtml(panel, vscode.Uri.file(dir), build);
      setPanelHtml(panel, vscode.Uri.file(dir), build);

      const nonces = build.mock.calls.map((call) => call[2]);

      expect(new Set(nonces).size).toBe(2);
    });

    it('WHEN build throws THEN the panel is disposed once, no html is assigned and the error is rethrown', () => {
      const build = vi.fn<HtmlBuilder>(() => {
        throw new Error('boom');
      });

      const set = (): void => {
        setPanelHtml(panel, vscode.Uri.file(dir), build);
      };

      expect(set).toThrow('boom');
      expect(fakes.fake.dispose).toHaveBeenCalledTimes(1);
      expect(fakes.fake.assigned).toStrictEqual([]);
    });
  });

  describe('GIVEN a page folder with no index.html', () => {
    it('WHEN the html is set THEN the panel is disposed, no html is assigned and ENOENT is thrown', () => {
      const build = vi.fn<HtmlBuilder>(() => 'built');

      const set = (): void => {
        setPanelHtml(panel, vscode.Uri.file(join(dir, 'missing')), build);
      };

      expect(set).toThrow('ENOENT');
      expect(build).not.toHaveBeenCalled();
      expect(fakes.fake.dispose).toHaveBeenCalledTimes(1);
      expect(fakes.fake.assigned).toStrictEqual([]);
    });
  });
});
