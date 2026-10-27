import { beforeEach, describe, expect, it, vi } from 'vitest';

import { editorIconThemePorts } from './icon-theme-ports.ts';

/** `vscode` exists only inside the editor, so the module is replaced here by the reads `icon-theme-ports.ts` makes. */
const editor = vi.hoisted(() => {
  const extension = { extensionPath: '/ext/a', packageJSON: {} };
  const fakes = { settings: new Map<string, unknown>(), all: [extension] };

  return fakes;
});

vi.mock('vscode', () => {
  const section = { get: (key: string): unknown => editor.settings.get(key) };
  const workspace = { getConfiguration: vi.fn(() => section) };
  const extensions = { all: editor.all };
  const module = { workspace, extensions };

  return module;
});

describe('FEATURE: editor icon theme ports', () => {
  beforeEach(() => {
    editor.settings.clear();
  });

  describe('GIVEN workbench.iconTheme', () => {
    it('WHEN it is a string THEN themeId() is that id', () => {
      editor.settings.set('iconTheme', 'vs-seti');

      const themeId = editorIconThemePorts().themeId();

      expect(themeId).toBe('vs-seti');
    });

    it('WHEN it is unset THEN themeId() is null', () => {
      const themeId = editorIconThemePorts().themeId();

      expect(themeId).toBeNull();
    });
  });

  it('GIVEN installed extensions WHEN they are read THEN extensions() is a copy of them', () => {
    const extensions = editorIconThemePorts().extensions();

    expect(extensions).toStrictEqual(editor.all);
    expect(extensions).not.toBe(editor.all);
  });

  it('GIVEN a file on disk WHEN its size and bytes are read THEN size() is the byte count read() returns', async () => {
    const ports = editorIconThemePorts();

    const size = await ports.size(import.meta.filename);
    const bytes = await ports.read(import.meta.filename);

    expect(size).toBe(bytes.byteLength);
  });
});
