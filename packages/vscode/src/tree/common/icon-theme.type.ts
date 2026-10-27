/** One installed extension, as far as the icon theme lookup reads it: `packageJSON` is outside input and stays `unknown`. */
export type ThemeExtension = {
  readonly extensionPath: string;
  readonly packageJSON: unknown;
};

/** The editor and disk reads `IconThemeFolders` needs, so a spec swaps them for an in-memory map. */
export type IconThemePorts = {
  readonly themeId: () => string | null;
  readonly extensions: () => ThemeExtension[];
  readonly size: (path: string) => Promise<number>;
  readonly read: (path: string) => Promise<Uint8Array>;
};

/** What the file icon theme says: whether it has folder icons (`null` when unknown) and the lowercased top-level `fileNames` keys it names. */
export type IconThemeFacts = {
  readonly folders: boolean | null;
  readonly fileNames: ReadonlySet<string>;
};

/** What `watchIcons` asks of the theme probe: the facts of the file icon theme now, and a way to forget the answer. */
export type IconThemeProbe = {
  readonly facts: () => Promise<IconThemeFacts>;
  readonly clear: () => void;
};
