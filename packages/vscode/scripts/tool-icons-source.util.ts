import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLOWED_LICENSES, ATTRIBUTION_LICENSES, ICON_VIEW_BOX } from './common/tool-icons.const.ts';
import { iconsSchema, manifestSchema } from './common/tool-icons.schema.ts';
import type { GlyphSource, IconData } from './common/tool-icons.type.ts';
import type { ToolGlyph, ToolSpec } from '../src/tool/common/tool.type.ts';

const PATH_TAG = /<path/g;

const iconsJsonPathOf = (): string => fileURLToPath(import.meta.resolve('simple-icons/icons.json'));

/** `icons.json` maps to `data/simple-icons.json`, so the package root is two directories above it. */
export const packageRootOf = (): string => {
  const iconsJson = iconsJsonPathOf();

  return dirname(dirname(iconsJson));
};

export const versionOf = async (root: string): Promise<string> => {
  const text = await readFile(join(root, 'package.json'), 'utf8');
  const manifest = manifestSchema.parse(JSON.parse(text));

  return manifest.version;
};

export const iconsOf = async (): Promise<Map<string, IconData>> => {
  const text = await readFile(iconsJsonPathOf(), 'utf8');
  const entries = iconsSchema.parse(JSON.parse(text));

  return new Map(entries.map((icon) => [icon.slug, icon]));
};

const refusal = (tool: ToolSpec, reason: string): Error => new Error(`${tool.id}: ${reason}`);

const shapeReasonOf = (svg: string): string | null => {
  const paths = svg.match(PATH_TAG) ?? [];
  const isOnePath = paths.length === 1;
  const isFullBox = svg.includes(ICON_VIEW_BOX);

  if (isOnePath && isFullBox) return null;

  return `svg must be one path in a ${ICON_VIEW_BOX}`;
};

const licenseReasonOf = (icon: IconData, glyph: ToolGlyph): string | null => {
  const type = icon.license?.type;

  if (type === undefined) return null;

  const isAllowed = ALLOWED_LICENSES.includes(type);

  if (!isAllowed) return `licence ${type} is not allowed`;

  const needsCredit = ATTRIBUTION_LICENSES.includes(type);
  const hasCredit = glyph.attribution !== null;

  if (needsCredit && !hasCredit) return `licence ${type} needs an attribution`;

  return null;
};

const sourceOf = async (tool: ToolSpec, glyph: ToolGlyph, icons: Map<string, IconData>): Promise<GlyphSource> => {
  const icon = icons.get(glyph.slug);

  if (icon === undefined) throw refusal(tool, `icon ${glyph.slug} is missing from Simple Icons`);

  const svgPath = fileURLToPath(import.meta.resolve(`simple-icons/icons/${glyph.slug}.svg`));
  const svg = await readFile(svgPath, 'utf8');
  const shapeReason = shapeReasonOf(svg);
  const licenseReason = licenseReasonOf(icon, glyph);
  const reason = shapeReason ?? licenseReason;

  if (reason !== null) throw refusal(tool, reason);

  const source: GlyphSource = { tool, glyph, icon, svg };

  return source;
};

/** Reads and checks every glyph tool, in table order; the first problem throws with the tool id and the reason. */
export const glyphSourcesOf = async (tools: ToolSpec[], icons: Map<string, IconData>): Promise<GlyphSource[]> => {
  const sources: GlyphSource[] = [];

  for (const tool of tools) {
    if (tool.glyph === null) continue;

    sources.push(await sourceOf(tool, tool.glyph, icons));
  }

  return sources;
};
