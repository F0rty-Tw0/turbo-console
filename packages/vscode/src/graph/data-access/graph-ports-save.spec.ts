import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { editorGraphHost } from './graph-ports.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { UriFake } from '../../shared/test/common/vscode-fakes.type.ts';
import type { GraphHost, GraphStore } from '../common/graph-panel.type.ts';

type ShowSaveDialog = (options: unknown) => Promise<UriFake | undefined>;

type WriteFile = (uri: UriFake, bytes: Uint8Array) => Promise<void>;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls the save ports make. */
const editor = vi.hoisted(() => {
  const spies = {
    showSaveDialog: vi.fn<ShowSaveDialog>(),
    showInformationMessage: vi.fn<(text: string) => Promise<undefined>>(),
    showErrorMessage: vi.fn<(text: string) => Promise<undefined>>(),
    writeFile: vi.fn<WriteFile>()
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
    showSaveDialog: editor.showSaveDialog,
    showInformationMessage: editor.showInformationMessage,
    showErrorMessage: editor.showErrorMessage
  };
  const fs = { writeFile: editor.writeFile };
  const uri = { joinPath, file };
  const viewColumn = { Active: -1, Beside: -2 };
  const workspace = { fs };
  const module = { Uri: uri, ViewColumn: viewColumn, window, workspace };

  return module;
});

const STORE: GraphStore = { get: vi.fn(), update: vi.fn() };

describe('FEATURE: the save ports of the Package Graph host', () => {
  let host: GraphHost;

  beforeEach(() => {
    const output: Output = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn(), dispose: vi.fn() };
    const extensionUri = vscode.Uri.file('/ext');

    host = editorGraphHost(extensionUri, output, STORE);
  });

  describe('GIVEN the editor save dialog', () => {
    it('WHEN pickSaveUri opens it THEN it gets the default file, the PNG filter and the title', async () => {
      editor.showSaveDialog.mockResolvedValue({ fsPath: '/out/x.png' });

      await host.pickSaveUri('/ws/a.png');

      const defaultUri: UriFake = { fsPath: '/ws/a.png' };
      const filters = { 'PNG image': ['png'] };

      expect(editor.showSaveDialog).toHaveBeenCalledExactlyOnceWith({
        defaultUri,
        filters,
        title: 'Export Package Graph Image'
      });
    });

    it('WHEN a file is chosen THEN pickSaveUri resolves its fsPath', async () => {
      editor.showSaveDialog.mockResolvedValue({ fsPath: '/out/x.png' });

      const path = await host.pickSaveUri('/ws/a.png');

      expect(path).toBe('/out/x.png');
    });

    it('WHEN the dialog is cancelled THEN pickSaveUri resolves null', async () => {
      editor.showSaveDialog.mockResolvedValue(undefined);

      const path = await host.pickSaveUri('/ws/a.png');

      expect(path).toBeNull();
    });
  });

  describe('GIVEN bytes to write', () => {
    it('WHEN writeBytes runs THEN workspace.fs writes them to the path', async () => {
      const bytes = Uint8Array.from([1, 2, 3]);

      await host.writeBytes('/out/x.png', bytes);

      expect(editor.writeFile).toHaveBeenCalledExactlyOnceWith({ fsPath: '/out/x.png' }, bytes);
    });
  });

  describe('GIVEN a message to show', () => {
    it('WHEN showInfo runs THEN the editor shows an information message', () => {
      host.showInfo('saved');

      expect(editor.showInformationMessage).toHaveBeenCalledExactlyOnceWith('saved');
    });

    it('WHEN showError runs THEN the editor shows an error message', () => {
      host.showError('broke');

      expect(editor.showErrorMessage).toHaveBeenCalledExactlyOnceWith('broke');
    });
  });
});
