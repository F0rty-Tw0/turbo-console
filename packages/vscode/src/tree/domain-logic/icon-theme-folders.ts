import { parse } from 'jsonc-parser';
import type { ParseError } from 'jsonc-parser';

import { ICON_THEME_BYTES_MAX, UNKNOWN_FACTS } from '../common/icon-theme.const.ts';
import type { IconThemeFacts, IconThemePorts, IconThemeProbe } from '../common/icon-theme.type.ts';
import { fileNamesOf, hasFolderKey, themeFileOf } from '../utils/icon-theme-file.util.ts';

/**
 * What the file icon theme in use says (folder icons, named files), read from the theme file its extension contributes. The
 * file is outside input, so any failure (no theme, no extension, a path leaving the extension, a big or broken file) is
 * `UNKNOWN_FACTS`, never a throw. The file is read as VS Code reads it: comments and trailing commas pass, any other parse error is a broken
 * file. One read per theme id until `clear()`; a `clear()` during a read keeps that read's answer out of the cache.
 */
export class IconThemeFolders implements IconThemeProbe {
  private readonly ports: IconThemePorts;
  private readonly cache = new Map<string, IconThemeFacts>();
  private generation = 0;

  public constructor(ports: IconThemePorts) {
    this.ports = ports;
  }

  public async facts(): Promise<IconThemeFacts> {
    const themeId = this.ports.themeId();

    if (themeId === null) return UNKNOWN_FACTS;

    const cached = this.cache.get(themeId);

    if (cached !== undefined) return cached;

    const { generation } = this;
    const facts = await this.probe(themeId);

    if (generation === this.generation) this.cache.set(themeId, facts);

    return facts;
  }

  public clear(): void {
    this.generation += 1;
    this.cache.clear();
  }

  private async probe(themeId: string): Promise<IconThemeFacts> {
    try {
      const file = themeFileOf(this.ports.extensions(), themeId);

      if (file === null) return UNKNOWN_FACTS;

      const size = await this.ports.size(file);

      if (size > ICON_THEME_BYTES_MAX) return UNKNOWN_FACTS;

      const bytes = await this.ports.read(file);
      const text = new TextDecoder().decode(bytes);
      const errors: ParseError[] = [];
      const parsed: unknown = parse(text, errors, { allowTrailingComma: true });

      if (errors.length > 0) return UNKNOWN_FACTS;

      const facts: IconThemeFacts = { folders: hasFolderKey(parsed), fileNames: fileNamesOf(parsed) };

      return facts;
    } catch {
      return UNKNOWN_FACTS;
    }
  }
}
