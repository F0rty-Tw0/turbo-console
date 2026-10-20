/** One tool's logo in the icon font. */
export type ToolGlyph = {
  /** The Simple Icons slug of its svg. */
  readonly slug: string;
  /** Its font code point, fixed forever. */
  readonly char: number;
  /** The text its icon licence requires, or `null` for a licence-free icon. */
  readonly attribution: string | null;
};

/** A well-known tool a task's command can run. */
export type ToolSpec = {
  /** The stable key and icon id suffix, such as `vitest`. */
  readonly id: string;
  /** The shown text, such as `Vitest`. */
  readonly title: string;
  /** The lower-case binary names that select it. */
  readonly bins: string[];
  /** `null`: detected and named in text, but no logo. */
  readonly glyph: ToolGlyph | null;
};

/** The tool a task's command runs, or `null`; `toolOf` answers it. */
export type ToolLookup = (command: string | null) => ToolSpec | null;

/** What a package's scripts offer a delegation: the bodies by name, and whether `turbo X` may follow to `X` (spec D2). */
export type PackageScripts = {
  /** Every script body of the package by name. */
  readonly bodies: ReadonlyMap<string, string>;
  /** `false` in a monorepo's root package `//`, where turbo runs `X` across the workspace. */
  readonly followTurbo: boolean;
};

/** The tool a command resolves to, and the script names it was reached through, in order (empty for a direct match). */
export type ToolMatch = {
  readonly tool: ToolSpec;
  readonly via: string[];
};

/** Resolves a command against its package's scripts; `resolveTool` is the one implementation. */
export type ToolResolver = (command: string | null, scripts: PackageScripts) => ToolMatch | null;
