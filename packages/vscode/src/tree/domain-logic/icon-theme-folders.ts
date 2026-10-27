import { parse } from 'jsonc-parser';
import type { ParseError } from 'jsonc-parser';

import { ICON_THEME_BYTES_MAX } from '../common/icon-theme.const.ts';
import type { IconThemePorts, IconThemeProbe } from '../common/icon-theme.type.ts';
import { hasFolderKey, themeFileOf } from '../utils/icon-theme-file.util.ts';

/**
 * Whether the file icon theme in use defines folder icons, read from the theme file its extension contributes. The file is
 * outside input, so any failure (no theme, no extension, a path leaving the extension, a big or broken file) is `null`,
 * never a throw. The file is read as VS Code reads it: comments and trailing commas pass, any other parse error is a broken
 * file. One read per theme id until `clear()`; a `clear()` during a read keeps that read's answer out of the cache.
 */
export class IconThemeFolders implements IconThemeProbe {
  private readonly ports: IconThemePorts;
  private readonly cache = new Map<string, boolean | null>();
  private generation = 0;

  public constructor(ports: IconThemePorts) {
    this.ports = ports;
  }

  public async has(): Promise<boolean | null> {
    const themeId = this.ports.themeId();

    if (themeId === null) return null;

    const cached = this.cache.get(themeId);

    if (cached !== undefined) return cached;

    const { generation } = this;
    const folders = await this.probe(themeId);

    if (generation === this.generation) this.cache.set(themeId, folders);

    return folders;
  }

  public clear(): void {
    this.generation += 1;
    this.cache.clear();
  }

  private async probe(themeId: string): Promise<boolean | null> {
    try {
      const file = themeFileOf(this.ports.extensions(), themeId);

      if (file === null) return null;

      const size = await this.ports.size(file);

      if (size > ICON_THEME_BYTES_MAX) return null;

      const bytes = await this.ports.read(file);
      const text = new TextDecoder().decode(bytes);
      const errors: ParseError[] = [];
      const parsed: unknown = parse(text, errors, { allowTrailingComma: true });

      if (errors.length > 0) return null;

      return hasFolderKey(parsed);
    } catch {
      return null;
    }
  }
}
