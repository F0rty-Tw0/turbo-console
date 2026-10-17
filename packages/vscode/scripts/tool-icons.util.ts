import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import svg2ttf from 'svg2ttf';
import { SVGIcons2SVGFontStream } from 'svgicons2svgfont';
import type { SVGIconStream } from 'svgicons2svgfont';

import { FONT_NAME, ICON_VIEW_BOX } from './common/tool-icons.const.ts';
import type { GlyphSource, OutputFile } from './common/tool-icons.type.ts';
import { glyphSourcesOf, iconsOf, packageRootOf, versionOf } from './tool-icons-source.util.ts';
import { cssOf, noticeOf } from './tool-icons-text.util.ts';
import type { ToolSpec } from '../src/tool/common/tool.type.ts';

/**
 * Units added on every side of the 24-unit icon box. Simple Icons fill their whole box while codicons leave padding;
 * the manual pass may change only this constant.
 */
export const GLYPH_PADDING = 1.5;

const FONT_OPTIONS = { fontName: FONT_NAME, fontHeight: 1000, normalize: true, descent: 0 };

/** Widens the one `0 0 24 24` viewBox by `padding` on every side; any other viewBox throws. */
export const paddedSvg = (svg: string, padding: number): string => {
  const hasViewBox = svg.includes(ICON_VIEW_BOX);

  if (!hasViewBox) throw new Error(`the svg has no ${ICON_VIEW_BOX}`);

  const size = 24 + 2 * padding;

  return svg.replace(ICON_VIEW_BOX, `viewBox="${-padding} ${-padding} ${size} ${size}"`);
};

const iconStreamOf = ({ tool, glyph, svg }: GlyphSource): SVGIconStream => {
  const metadata = { name: tool.id, unicode: [String.fromCodePoint(glyph.char)] };
  const padded = paddedSvg(svg, GLYPH_PADDING);

  return Object.assign(Readable.from([padded]), { metadata });
};

const svgFontOf = async (sources: GlyphSource[]): Promise<string> => {
  const stream = new SVGIcons2SVGFontStream(FONT_OPTIONS);
  const chunks: string[] = [];
  const font = new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk: string) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(chunks.join('')));
  });

  for (const source of sources) stream.write(iconStreamOf(source));

  stream.end();

  return font;
};

const ttfOf = async (sources: GlyphSource[]): Promise<Uint8Array> => {
  const svgFont = await svgFontOf(sources);

  return svg2ttf(svgFont, { ts: 0 }).buffer;
};

/**
 * Spec 1c-c §4.3: checks every glyph tool, builds the five files in memory, then writes them all. Any problem before
 * the write rejects with the tool id and the reason and leaves `outDir` as it was.
 */
export const buildToolIcons = async (tools: ToolSpec[], outDir: string): Promise<void> => {
  const root = packageRootOf();
  const icons = await iconsOf(tools);
  const sources = await glyphSourcesOf(tools, icons);
  const ttf = await ttfOf(sources);
  const version = await versionOf(root);
  const css = cssOf(sources);
  const notice = noticeOf(sources, version);
  const license = await readFile(join(root, 'LICENSE.md'));
  const disclaimer = await readFile(join(root, 'DISCLAIMER.md'));
  const files: OutputFile[] = [
    ['tool-icons.ttf', ttf],
    ['tool-icons.css', css],
    ['TOOL-ICONS-NOTICE.md', notice],
    ['SIMPLE-ICONS-LICENSE.md', license],
    ['SIMPLE-ICONS-DISCLAIMER.md', disclaimer]
  ];

  await mkdir(outDir, { recursive: true });
  await Promise.all(files.map(async ([name, content]) => writeFile(join(outDir, name), content)));
};
