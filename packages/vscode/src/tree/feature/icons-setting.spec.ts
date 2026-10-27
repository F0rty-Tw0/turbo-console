import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigurationChangeEvent, Disposable } from 'vscode';

import { watchIcons } from './icons-setting.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { outputMock } from '../../shared/test/mocks/output.mock.ts';
import { NO_FILE_NAMES } from '../common/icon-theme.const.ts';
import type { IconThemeFacts, IconThemeProbe } from '../common/icon-theme.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import { packagesTreeApiMock } from '../test/mocks/packages-tree-api.mock.ts';

type SettingsListener = (event: ConfigurationChangeEvent) => void;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `icons-setting.ts` makes. */
const editor = vi.hoisted(() => {
  const spies = {
    settings: new Map<string, unknown>(),
    onDidChangeConfiguration: vi.fn<(listener: SettingsListener) => Disposable>(),
    onDidChangeExtensions: vi.fn<(listener: () => void) => Disposable>()
  };

  return spies;
});

vi.mock('vscode', () => {
  const section = { get: (key: string): unknown => editor.settings.get(key) };
  const workspace = { onDidChangeConfiguration: editor.onDidChangeConfiguration, getConfiguration: vi.fn(() => section) };
  const extensions = { onDidChange: editor.onDidChangeExtensions, all: [] };
  const module = { workspace, extensions };

  return module;
});

const disposableFake = (): Disposable => {
  const disposable: Disposable = { dispose: vi.fn() };

  return disposable;
};

const eventFor = (changed: string): ConfigurationChangeEvent => {
  const event: ConfigurationChangeEvent = { affectsConfiguration: (section) => section === changed };

  return event;
};

/** One macrotask: every promise chain reached before it has run to its end. */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

const factsOf = (folders: boolean | null): IconThemeFacts => {
  const facts: IconThemeFacts = { folders, fileNames: NO_FILE_NAMES };

  return facts;
};

type Deferred = { readonly promise: Promise<IconThemeFacts>; readonly settle: (value: boolean | null) => void };

const deferredOf = (): Deferred => {
  let settle: Deferred['settle'] = () => undefined;
  const promise = new Promise<IconThemeFacts>((resolve) => {
    settle = (value): void => {
      resolve(factsOf(value));
    };
  });
  const deferred: Deferred = { promise, settle };

  return deferred;
};

describe('FEATURE: watchIcons', () => {
  let tree: PackagesTreeApi;
  let output: Output;
  let subscriptions: Disposable[];
  let facts: Mock<IconThemeProbe['facts']>;
  let clear: Mock<IconThemeProbe['clear']>;

  const fireSettings = (changed: string): void => {
    const listener = editor.onDidChangeConfiguration.mock.calls.at(0)?.[0];

    listener?.(eventFor(changed));
  };
  const fireExtensions = (): void => {
    const listener = editor.onDidChangeExtensions.mock.calls.at(0)?.[0];

    listener?.();
  };
  const setIconsCalls = (): unknown[] => vi.mocked(tree.setIcons).mock.calls.map((call) => call[0]);
  const watch = (): void => {
    const folders: IconThemeProbe = { facts, clear };

    watchIcons(tree, subscriptions, output, folders);
  };

  beforeEach(() => {
    editor.settings.clear();
    editor.onDidChangeConfiguration.mockReset();
    editor.onDidChangeConfiguration.mockImplementation(disposableFake);
    editor.onDidChangeExtensions.mockReset();
    editor.onDidChangeExtensions.mockImplementation(disposableFake);
    tree = packagesTreeApiMock();
    output = outputMock();
    subscriptions = [];
    facts = vi.fn<IconThemeProbe['facts']>(async () => Promise.resolve(factsOf(false)));
    clear = vi.fn<IconThemeProbe['clear']>();
  });

  describe('GIVEN the icons setting is unset', () => {
    it('WHEN watching starts THEN the theme folders are resolved once and the tree gets the mode', async () => {
      facts.mockResolvedValue(factsOf(true));
      watch();
      await flush();

      expect(facts).toHaveBeenCalledTimes(1);
      expect(setIconsCalls()).toStrictEqual(['theme']);
    });

    it('WHEN workbench.iconTheme changes THEN the folders are resolved again and the tree gets the new mode', async () => {
      facts.mockResolvedValueOnce(factsOf(false)).mockResolvedValueOnce(factsOf(true));
      watch();
      await flush();
      fireSettings('workbench.iconTheme');
      await flush();

      expect(setIconsCalls()).toStrictEqual(['builtin', 'theme']);
    });

    it('WHEN workbench.iconTheme changes to a theme without folders THEN the tree goes back to builtin', async () => {
      facts.mockResolvedValueOnce(factsOf(true)).mockResolvedValueOnce(factsOf(false));
      watch();
      await flush();
      fireSettings('workbench.iconTheme');
      await flush();

      expect(setIconsCalls()).toStrictEqual(['theme', 'builtin']);
    });

    it('WHEN turboConsole.icons changes THEN the folders are resolved again with the new setting', async () => {
      facts.mockResolvedValue(factsOf(true));
      watch();
      await flush();
      editor.settings.set('icons', 'builtin');
      fireSettings('turboConsole.icons');
      await flush();

      expect(setIconsCalls()).toStrictEqual(['theme', 'builtin']);
    });

    it('WHEN an unrelated setting changes THEN nothing is resolved again', async () => {
      watch();
      await flush();
      fireSettings('turboConsole.treeMode');
      await flush();

      expect(facts).toHaveBeenCalledTimes(1);
    });

    it('WHEN an extension is installed or removed THEN clear() runs before the next facts()', async () => {
      watch();
      await flush();
      facts.mockClear();
      fireExtensions();
      await flush();

      expect(clear).toHaveBeenCalledTimes(1);
      expect(clear.mock.invocationCallOrder[0]).toBeLessThan(facts.mock.invocationCallOrder[0] ?? 0);
    });
  });

  describe('GIVEN two resolves in flight', () => {
    it('WHEN they land out of order THEN the latest request wins', async () => {
      const first = deferredOf();
      const second = deferredOf();

      facts.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
      watch();
      fireSettings('workbench.iconTheme');
      second.settle(true);
      await flush();
      first.settle(false);
      await flush();

      expect(setIconsCalls()).toStrictEqual(['theme']);
    });
  });

  describe('GIVEN facts() rejects', () => {
    it('WHEN watching starts THEN the error is logged, the tree draws builtin and nothing throws', async () => {
      facts.mockRejectedValue(new Error('boom'));
      watch();
      await flush();

      expect(output.error).toHaveBeenCalledTimes(1);
      expect(setIconsCalls()).toStrictEqual(['builtin']);
    });
  });

  describe.each(['theme', 'builtin'])('GIVEN the icons setting is %s', (setting) => {
    beforeEach(async () => {
      editor.settings.set('icons', setting);
      watch();
      await flush();
    });

    it('WHEN watching starts THEN the tree gets that mode', () => {
      expect(setIconsCalls()).toStrictEqual([setting]);
    });

    it('WHEN workbench.iconTheme changes THEN the theme file is never asked about', async () => {
      fireSettings('workbench.iconTheme');
      await flush();

      expect(facts).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN watching started', () => {
    it('WHEN subscriptions are read THEN both listeners are registered in them', () => {
      watch();

      expect(subscriptions).toHaveLength(2);
    });
  });
});
