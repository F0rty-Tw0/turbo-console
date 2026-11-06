export const LINE_FEED_CODE = 0x0a;

export const CARRIAGE_RETURN_CODE = 0x0d;

/** A leading byte order mark is skipped, D3; a later one is whitespace, like the Unicode spaces below. */
export const BOM_CODE = 0xfeff;

export const SLASH_CODE = 0x2f;

export const BACKTICK_CODE = 0x60;

export const OPEN_BRACE_CODE = 0x7b;

export const NO_BREAK_SPACE_CODE = 0x00a0;

export const OGHAM_SPACE_MARK_CODE = 0x1680;

/** U+2000 to U+200A, the en quad through the hair space; U+200B is not a space separator. */
export const EN_QUAD_CODE = 0x2000;

export const HAIR_SPACE_CODE = 0x200a;

export const LINE_SEPARATOR_CODE = 0x2028;

export const PARAGRAPH_SEPARATOR_CODE = 0x2029;

export const NARROW_NO_BREAK_SPACE_CODE = 0x202f;

export const MEDIUM_MATHEMATICAL_SPACE_CODE = 0x205f;

export const IDEOGRAPHIC_SPACE_CODE = 0x3000;

/** `SourceImport.text` is the raw line sliced to this many UTF-16 units; the host cuts it further, D13. */
export const SOURCE_LINE_MAX = 1000;

/** A `/` after one of these words starts a regex, not a division, D3. */
export const REGEX_AFTER_WORDS: ReadonlySet<string> = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await'
]);
