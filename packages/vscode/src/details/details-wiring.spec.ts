import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { createPanels } from './details-wiring.ts';
import type { DetailsPanels } from './domain-logic/details-panels.ts';
import { DETAILS_LOADED_STUB } from './test/stubs/details-model.stub.ts';
import { copyPageRoot } from './test/utils/page-root.spec.util.ts';
import type { PanelRoots } from '../roots/common/panel-roots.type.ts';
import { RootStore } from '../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../run/domain-logic/run-store.ts';
import type { Output } from '../shared/common/output.type.ts';
import type { PageRoot } from '../shared/test/common/page-root.type.ts';
import type { PanelFake, UriFake } from '../shared/test/common/vscode-fakes.type.ts';
import { scriptsToggleMock } from '../shared/test/mocks/scripts-toggle.mock.ts';
import { webviewPanelMock } from '../shared/test/mocks/webview-panel.mock.ts';
import { ROOT_FOLDER_STUB } from '../tree/test/stubs/root-state.stub.ts';

type CreatePanel = (viewType: string, title: string, column: number, options: unknown) => PanelFake;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls the wiring makes. */
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

const createPanel = (): PanelFake => webviewPanelMock().fake;

describe('FEATURE: the details wiring', () => {
  let page: PageRoot;
  let session: PanelRoots;
  let panels: DetailsPanels;

  beforeEach(() => {
    const store = new RootStore();
    const output: Output = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn(), dispose: vi.fn() };
    const shared = { runs: new RunStore(), scripts: scriptsToggleMock() };

    page = copyPageRoot();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', DETAILS_LOADED_STUB);
    session = { store, setPanelVisible: vi.fn() };
    editor.createWebviewPanel.mockReset();
    editor.createWebviewPanel.mockImplementation(createPanel);
    panels = createPanels({ extensionUri: vscode.Uri.file(page.root) }, session, shared, output);
  });

  afterEach(() => {
    panels.dispose();
    page.dispose();
  });

  describe('GIVEN a package of a loaded root', () => {
    it('WHEN its panel opens shown THEN the root session hears that panel shown', async () => {
      await panels.open({ root: '/ws', packageName: 'a' });

      expect(session.setPanelVisible).toHaveBeenCalledExactlyOnceWith('/ws', '/ws\0a', true);
    });

    it('WHEN its panel opens THEN it is a webview panel made by the editor', async () => {
      await panels.open({ root: '/ws', packageName: 'a' });

      expect(editor.createWebviewPanel).toHaveBeenCalledOnce();
    });
  });
});
