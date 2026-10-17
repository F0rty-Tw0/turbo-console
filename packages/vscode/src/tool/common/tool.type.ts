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
