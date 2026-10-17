import { FONT_NAME, ICON_CLASS_PREFIX } from './common/tool-icons.const.ts';
import type { GlyphSource } from './common/tool-icons.type.ts';
import { MIT_LICENSE_TEXT } from './mit-license.const.ts';

const FONT_FACE = `@font-face {
  font-family: '${FONT_NAME}';
  src: url('tool-icons.ttf') format('truetype');
}`;

const TRADEMARK_LINE =
  'All product names, logos and brands are property of their respective owners. Their use here identifies the tool a task runs and does not imply endorsement.';

const ruleOf = ({ tool, glyph }: GlyphSource): string => {
  const code = glyph.char.toString(16);

  return `.${ICON_CLASS_PREFIX}${tool.id}:before {\n  font-family: '${FONT_NAME}' !important;\n  content: '\\${code}';\n}`;
};

export const cssOf = (sources: GlyphSource[]): string => {
  const rules = sources.map(ruleOf);
  const blocks = [FONT_FACE, ...rules];
  const css = blocks.join('\n\n');

  return `${css}\n`;
};

const sectionOf = ({ tool, glyph, icon }: GlyphSource): string => {
  const type = icon.license?.type;
  const lines = [`## ${tool.title}`, '', `- Simple Icons slug: ${glyph.slug}`, `- Source: ${icon.source}`];

  if (icon.guidelines !== undefined) lines.push(`- Guidelines: ${icon.guidelines}`);

  if (type !== undefined) lines.push(`- Licence: ${type}`);

  if (glyph.attribution !== null) lines.push('', glyph.attribution);

  if (type === 'MIT') lines.push('', MIT_LICENSE_TEXT);

  return lines.join('\n');
};

const headerOf = (version: string): string => {
  const font = '`tool-icons.ttf`';
  const license = '`SIMPLE-ICONS-LICENSE.md`';
  const disclaimer = '`SIMPLE-ICONS-DISCLAIMER.md`';

  return `# Tool icons notice\n\nThe font ${font} is built from Simple Icons ${version}. The Simple Icons package is CC0-1.0 (see ${license}); that does not cover the logos themselves. A logo's licence is listed below where Simple Icons records one. Trademark disclaimer: ${disclaimer}.`;
};

export const noticeOf = (sources: GlyphSource[], version: string): string => {
  const sections = sources.map(sectionOf);
  const blocks = [headerOf(version), ...sections, TRADEMARK_LINE];
  const notice = blocks.join('\n\n');

  return `${notice}\n`;
};
