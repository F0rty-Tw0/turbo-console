import { graphIcon } from './graph-icon.ts';
import type { GraphAtomCounts } from '../../bridge/common/graph-message.type.ts';
import {
  ATOM_CHIP_BORDER_PX,
  ATOM_CHIP_FONT_PX,
  ATOM_CHIP_GAP_PX,
  ATOM_CHIP_GLYPH_GAP_PX,
  ATOM_CHIP_GLYPH_PX,
  ATOM_CHIP_HEIGHT_PX,
  ATOM_CHIP_PAD_PX
} from '../common/graph-atom.const.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';

type ChipKind = 'files' | 'cached' | 'failed';

type ChipModel = {
  readonly kind: ChipKind;
  readonly text: string;
  /** The glyph of an outlined chip; the files chip has none. */
  readonly icon: GraphIconId | null;
};

const ROW_STYLE: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  top: '0px',
  left: '0px',
  transformOrigin: '0 0',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: `${String(ATOM_CHIP_GAP_PX)}px`,
  height: `${String(ATOM_CHIP_HEIGHT_PX)}px`,
  pointerEvents: 'none'
};

/** The height is the chip's border box, so the text line sits inside the border. */
const CHIP_STYLE: Partial<CSSStyleDeclaration> = {
  boxSizing: 'border-box',
  height: `${String(ATOM_CHIP_HEIGHT_PX)}px`,
  fontSize: `${String(ATOM_CHIP_FONT_PX)}px`,
  paddingLeft: `${String(ATOM_CHIP_PAD_PX)}px`,
  paddingRight: `${String(ATOM_CHIP_PAD_PX)}px`,
  lineHeight: `${String(ATOM_CHIP_HEIGHT_PX - 2 * ATOM_CHIP_BORDER_PX)}px`
};

const GLYPH_STYLE: Partial<CSSStyleDeclaration> = {
  width: `${String(ATOM_CHIP_GLYPH_PX)}px`,
  marginRight: `${String(ATOM_CHIP_GLYPH_GAP_PX)}px`,
  fontSize: `${String(ATOM_CHIP_GLYPH_PX)}px`
};

/** The chips `atomCountsText` words: files always, cached once the dry run settled, failed when any failed. */
const chipModelsOf = (counts: GraphAtomCounts): ChipModel[] => {
  const { files, cached, failed } = counts;
  const filesChip: ChipModel = { kind: 'files', text: `${String(files)} files`, icon: null };
  const models = [filesChip];

  if (cached !== null) models.push({ kind: 'cached', text: `${String(cached)} cached`, icon: 'history' });

  if (failed !== null && failed > 0) models.push({ kind: 'failed', text: `${String(failed)} failed`, icon: 'error' });

  return models;
};

const chipOf = (model: ChipModel, glyphs: boolean): HTMLElement => {
  const chip = document.createElement('span');

  chip.className = `atom-chip atom-chip-${model.kind}`;
  Object.assign(chip.style, CHIP_STYLE);
  chip.textContent = model.text;

  if (!glyphs || model.icon === null) return chip;

  const glyph = graphIcon(model.icon);

  glyph.classList.add('atom-chip-glyph');
  Object.assign(glyph.style, GLYPH_STYLE);
  chip.prepend(glyph);

  return chip;
};

/** An umbrella's chip row: a chip per counts part, the cached and failed chips led by a glyph when `glyphs`; its width and place are the caller's. */
export const buildAtomChipRow = (counts: GraphAtomCounts, glyphs: boolean): HTMLElement => {
  const row = document.createElement('div');
  const models = chipModelsOf(counts);
  const chips = models.map((model) => chipOf(model, glyphs));

  row.className = 'atom-chips';
  Object.assign(row.style, ROW_STYLE);
  row.append(...chips);

  return row;
};
