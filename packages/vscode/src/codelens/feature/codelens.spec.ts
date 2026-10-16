import type { PackageNode, TaskNode } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CodeLens, Disposable } from 'vscode';
import { Uri } from 'vscode';

import { registerCodeLens } from './register-codelens.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';
import type { LoadedModel, RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOADED_MODEL_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { LensDocument } from '../common/codelens.type.ts';

type LinePosition = {
  readonly line: number;
};

type LensProvider = {
  readonly provideCodeLenses: (document: LensDocument) => CodeLens[];
};

/** Every value the lens provider's event emitter fired, in order. */
const fired = vi.hoisted((): unknown[] => []);

const editor = vi.hoisted(() => {
  const spies = {
    registerCodeLensProvider: vi.fn<(selector: unknown, provider: LensProvider) => Disposable>(),
    getWorkspaceFolder: vi.fn<(uri: unknown) => unknown>(),
    emitterDispose: vi.fn()
  };

  return spies;
});

/** Providing lenses reads no file, so the file system modules are replaced by spies that must stay uncalled. */
vi.mock('node:fs');
vi.mock('node:fs/promises');

/** `vscode` exists only inside the editor, so the module is replaced here by the calls the lens makes. */
vi.mock('vscode', () => {
  class EventEmitter {
    public readonly event = 'event';
    public readonly fire = vi.fn((value: unknown): void => {
      fired.push(value);
    });

    public readonly dispose = editor.emitterDispose;
  }

  class FakeUri {
    public readonly fsPath: string;

    public constructor(fsPath: string) {
      this.fsPath = fsPath;
    }

    public static file(fsPath: string): FakeUri {
      return new FakeUri(fsPath);
    }
  }

  class Range {
    public readonly start: LinePosition;

    public constructor(line: number) {
      this.start = { line };
    }
  }

  class CodeLens {
    public readonly range: Range;
    public readonly command: unknown;

    public constructor(range: Range, command: unknown) {
      this.range = range;
      this.command = command;
    }
  }

  const languages = { registerCodeLensProvider: editor.registerCodeLensProvider };
  const workspace = { getWorkspaceFolder: editor.getWorkspaceFolder };
  const module = { EventEmitter, Uri: FakeUri, Range, CodeLens, languages, workspace };

  return module;
});

const ONE: RootFolder = { root: '/ws', name: 'ws' };

const OWNED = '/ws/packages/a/package.json';

const TEXT = '{\n  "name": "a",\n  "scripts": {}\n}\n';

const taskNamed = (name: string, isTurboTask: boolean): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `a#${name}`, name, isTurboTask };

  return task;
};

const MODEL_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [taskNamed('build', true), taskNamed('zap', false)] };

const loadedModel = (): LoadedModel => {
  const model = { ...WORKSPACE_MODEL_STUB, packages: [MODEL_PACKAGE] };
  const loaded: LoadedModel = { ...LOADED_MODEL_STUB, model };

  return loaded;
};

const documentOf = (fsPath: string): LensDocument => {
  const uri = Uri.file(fsPath);
  const document: LensDocument = { uri, getText: () => TEXT };

  return document;
};

const titlesOf = (lenses: CodeLens[]): Array<string | undefined> => lenses.map((lens) => lens.command?.title);

const linesOf = (lenses: CodeLens[]): number[] => lenses.map((lens) => lens.range.start.line);

const callCountOf = (members: unknown[]): number => {
  const spies = members.filter((member) => vi.isMockFunction(member));
  const counts = spies.map((spy) => spy.mock.calls.length);

  return counts.reduce((total, count) => total + count, 0);
};

describe('FEATURE: package.json CodeLens (spec 1c-b §4.11)', () => {
  let roots: RootStore;
  let coordinator: Coordinator;
  let provider: LensProvider;
  let registration: Disposable;
  let toggle: ScriptsToggleFake;
  let lens: Disposable;

  beforeEach(() => {
    fired.length = 0;
    roots = new RootStore();
    coordinator = coordinatorMock();
    toggle = scriptsToggleMock();
    registration = { dispose: vi.fn() };
    editor.registerCodeLensProvider.mockImplementation((_selector, registered) => {
      provider = registered;

      return registration;
    });
    editor.getWorkspaceFolder.mockReturnValue({ uri: Uri.file('/ws') });
    roots.set([ONE], () => coordinator);
    roots.apply('/ws', loadedModel());
    lens = registerCodeLens(roots, toggle);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('WHEN the lens registers THEN one provider serves the package.json files on disk', () => {
    const selector = { language: 'json', scheme: 'file', pattern: '**/package.json' };

    expect(editor.registerCodeLensProvider).toHaveBeenCalledExactlyOnceWith(selector, provider);
  });

  describe('GIVEN an owned package.json of a loaded root', () => {
    it('WHEN VS Code asks THEN one lens sits on the "scripts" key line', () => {
      const lenses = provider.provideCodeLenses(documentOf(OWNED));

      expect(linesOf(lenses)).toStrictEqual([2]);
    });

    it('WHEN VS Code asks THEN the lens opens the package picker for that file', () => {
      const document = documentOf(OWNED);

      const lenses = provider.provideCodeLenses(document);

      expect(lenses[0]?.command).toStrictEqual({
        title: '▷ Tasks: build (1)',
        command: 'turboConsole.runPackageTask',
        arguments: [document.uri]
      });
    });

    it('WHEN scripts are shown THEN the title lists the script after the turbo task', async () => {
      await toggle.set(true);

      const lenses = provider.provideCodeLenses(documentOf(OWNED));

      expect(titlesOf(lenses)).toStrictEqual(['▷ Tasks: build, zap (2)']);
    });

    it('WHEN VS Code asks THEN no load starts', () => {
      provider.provideCodeLenses(documentOf(OWNED));

      expect(coordinator.ensureLoaded).not.toHaveBeenCalled();
    });

    it('WHEN VS Code asks THEN no file system call is made', async () => {
      const fs = await import('node:fs');
      const promises = await import('node:fs/promises');
      const named = Object.values(fs);
      const defaults = Object.values(fs.default);
      const asyncNamed = Object.values(promises);
      const members = [...named, ...defaults, ...asyncNamed];

      provider.provideCodeLenses(documentOf(OWNED));

      expect(callCountOf(members)).toBe(0);
    });
  });

  describe('GIVEN a file with no lens', () => {
    it('WHEN it is in no workspace folder THEN there are no lenses', () => {
      editor.getWorkspaceFolder.mockReturnValue(undefined);

      expect(provider.provideCodeLenses(documentOf('/elsewhere/package.json'))).toStrictEqual([]);
    });

    it('WHEN its workspace folder is no known root THEN there are no lenses', () => {
      editor.getWorkspaceFolder.mockReturnValue({ uri: Uri.file('/other') });

      expect(provider.provideCodeLenses(documentOf('/other/packages/a/package.json'))).toStrictEqual([]);
    });

    it('WHEN no package owns it THEN there are no lenses', () => {
      expect(provider.provideCodeLenses(documentOf('/ws/packages/none/package.json'))).toStrictEqual([]);
    });
  });

  describe('GIVEN the lens is registered', () => {
    it('WHEN a root applies a load THEN the lenses refresh', () => {
      roots.apply('/ws', loadedModel());

      expect(fired).toStrictEqual([undefined]);
    });

    it('WHEN the scripts toggle changes THEN the lenses refresh', async () => {
      await toggle.set(true);

      expect(fired).toStrictEqual([undefined]);
    });

    it('WHEN the lens is disposed THEN the provider registration goes', () => {
      lens.dispose();

      expect(registration.dispose).toHaveBeenCalledOnce();
    });

    it('WHEN the lens is disposed THEN the event emitter goes', () => {
      lens.dispose();

      expect(editor.emitterDispose).toHaveBeenCalledOnce();
    });

    it('WHEN the lens is disposed THEN a root load and a toggle refresh nothing', async () => {
      lens.dispose();
      roots.apply('/ws', loadedModel());
      await toggle.set(true);

      expect(fired).toStrictEqual([]);
    });
  });
});
