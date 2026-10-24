import { beforeEach, describe, expect, it, vi } from 'vitest';

import { editorGraphCommandPorts } from './graph-command-ports.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';

type PickItem = { readonly label: string; readonly description?: string };

type ShowQuickPick = (items: PickItem[], options: unknown) => Promise<PickItem | PickItem[] | undefined>;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `graph-command-ports.ts` makes. */
const editor = vi.hoisted(() => {
  const spies = {
    showQuickPick: vi.fn<ShowQuickPick>(),
    showInformationMessage: vi.fn<(text: string) => Promise<undefined>>(),
    showErrorMessage: vi.fn<(text: string) => Promise<undefined>>()
  };

  return spies;
});

vi.mock('vscode', () => {
  const window = {
    showQuickPick: editor.showQuickPick,
    showInformationMessage: editor.showInformationMessage,
    showErrorMessage: editor.showErrorMessage
  };
  const module = { window };

  return module;
});

const OTHER_FOLDER: RootFolder = { root: '/other', name: 'ws' };
const FOLDERS: RootFolder[] = [ROOT_FOLDER_STUB, OTHER_FOLDER];

const TASK_ITEMS = [
  { label: 'build', description: 'web', root: '/ws', value: 'web#build' },
  { label: 'build', description: 'api', root: '/ws', value: 'api#build' }
];

const pickSecond = async (items: PickItem[]): Promise<PickItem | undefined> => Promise.resolve(items[1]);

describe('FEATURE: the editor effects of Show Package Graph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editor.showInformationMessage.mockResolvedValue(undefined);
    editor.showErrorMessage.mockResolvedValue(undefined);
  });

  describe('GIVEN two folders with the same name', () => {
    it('WHEN the user picks the second THEN its root is the result, not its name', async () => {
      editor.showQuickPick.mockImplementation(pickSecond);
      const ports = editorGraphCommandPorts(vi.fn(), vi.fn(), vi.fn());

      const picked = await ports.pick(FOLDERS);

      expect(picked).toBe('/other');
    });

    it('WHEN the pick is shown THEN each item is the folder name with its root beside it', async () => {
      editor.showQuickPick.mockResolvedValue(undefined);
      const ports = editorGraphCommandPorts(vi.fn(), vi.fn(), vi.fn());

      await ports.pick(FOLDERS);

      const [items] = editor.showQuickPick.mock.calls[0] ?? [];

      expect(items).toStrictEqual([
        { label: 'ws', description: '/ws' },
        { label: 'ws', description: '/other' }
      ]);
    });

    it('WHEN the user cancels the pick THEN the result is undefined', async () => {
      editor.showQuickPick.mockResolvedValue(undefined);
      const ports = editorGraphCommandPorts(vi.fn(), vi.fn(), vi.fn());

      const picked = await ports.pick(FOLDERS);

      expect(picked).toBeUndefined();
    });
  });

  describe('GIVEN task items', () => {
    it('WHEN the user ticks both THEN the result is their values in order', async () => {
      editor.showQuickPick.mockResolvedValue(TASK_ITEMS);
      const ports = editorGraphCommandPorts(vi.fn(), vi.fn(), vi.fn());

      const picked = await ports.pickMany(TASK_ITEMS, 'Choose tasks to show');

      expect(picked).toStrictEqual(['web#build', 'api#build']);
    });

    it('WHEN the pick is shown THEN it allows many and carries the placeholder', async () => {
      editor.showQuickPick.mockResolvedValue(undefined);
      const ports = editorGraphCommandPorts(vi.fn(), vi.fn(), vi.fn());

      await ports.pickMany(TASK_ITEMS, 'Choose tasks to show');

      expect(editor.showQuickPick).toHaveBeenCalledExactlyOnceWith(TASK_ITEMS, {
        canPickMany: true,
        placeHolder: 'Choose tasks to show'
      });
    });

    it('WHEN the user cancels THEN the result is undefined', async () => {
      editor.showQuickPick.mockResolvedValue(undefined);
      const ports = editorGraphCommandPorts(vi.fn(), vi.fn(), vi.fn());

      const picked = await ports.pickMany(TASK_ITEMS, 'Choose tasks to show');

      expect(picked).toBeUndefined();
    });
  });

  describe('GIVEN the active file', () => {
    it('WHEN it is asked for THEN fileOf is called with no resource', () => {
      const fileOf = vi.fn(() => '/ws/package.json');
      const ports = editorGraphCommandPorts(fileOf, vi.fn(), vi.fn());

      const file = ports.activeFile();

      expect(file).toBe('/ws/package.json');
      expect(fileOf).toHaveBeenCalledExactlyOnceWith(undefined);
    });
  });

  describe('GIVEN a message for the user', () => {
    it('WHEN info is shown THEN the information message gets the text', () => {
      const ports = editorGraphCommandPorts(vi.fn(), vi.fn(), vi.fn());

      ports.info('no root');

      expect(editor.showInformationMessage).toHaveBeenCalledExactlyOnceWith('no root');
    });

    it('WHEN an error is shown THEN the error message gets the text', () => {
      const ports = editorGraphCommandPorts(vi.fn(), vi.fn(), vi.fn());

      ports.error('Could not open the Package Graph. See Output.');

      expect(editor.showErrorMessage).toHaveBeenCalledExactlyOnceWith('Could not open the Package Graph. See Output.');
    });
  });

  describe('GIVEN the root and log functions', () => {
    it('WHEN the ports are made THEN rootOf and log are the ones passed in', () => {
      const rootOf = vi.fn(() => '/ws');
      const log = vi.fn();

      const ports = editorGraphCommandPorts(vi.fn(), rootOf, log);

      expect(ports.rootOf).toBe(rootOf);
      expect(ports.log).toBe(log);
    });
  });
});
