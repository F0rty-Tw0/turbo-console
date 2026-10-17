import type { ToolGlyph, ToolSpec } from '../../src/tool/common/tool.type.ts';

type IconLicense = {
  readonly type: string;
};

/** One entry of `simple-icons/icons.json`. */
export type IconData = {
  readonly title: string;
  readonly slug: string;
  readonly source: string;
  readonly license?: IconLicense | undefined;
};

/** A glyph tool with its checked Simple Icons data and svg text. */
export type GlyphSource = {
  readonly tool: ToolSpec;
  readonly glyph: ToolGlyph;
  readonly icon: IconData;
  readonly svg: string;
};

/** The five files the build writes: name and content. */
export type OutputFile = readonly [string, string | Uint8Array];
