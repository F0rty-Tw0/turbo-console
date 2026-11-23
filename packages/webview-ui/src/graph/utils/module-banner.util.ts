import type { ImportLimit } from '../../bridge/common/graph-imports.type.ts';
import type { ModuleLink, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import { NO_MODULE_FILES_TEXT } from '../common/graph-module.const.ts';

const SEPARATOR = ' · ';

const importsOf = (sum: number, link: ModuleLink): number => {
  const [, , statics, types, lazies] = link;

  return sum + statics + types + lazies;
};

/** The banner's first sentence: the limit the scan hit, or a bare "Partial:" before the dropped count. */
const leadOf = (limit: ImportLimit | null): string => {
  switch (limit) {
    case null:
      return 'Partial:';
    case 'files':
      return 'Partial: the scan stopped at the file limit. Files past it are not shown, and imports of them count as unresolved.';
    case 'entries':
      return 'Partial: the scan stopped at the entry limit. Files past it are not shown, and imports of them count as unresolved.';
    case 'time':
      return 'Partial: the scan ran out of time. Some files are shown without their imports.';
  }
};

const droppedTextOf = (dropped: number): string => `${dropped} items were left out to keep the graph small.`;

/** "<files> files · <imports> imports · <unresolved> unresolved", from the payload only, so toggles and collapse never change it. */
export const moduleStatusOf = (found: ModulesFound): string => {
  const links = [...found.fileLinks, ...found.stubLinks];
  const imports = links.reduce(importsOf, 0);
  const parts = [`${found.files.length} files`, `${imports} imports`, `${found.counts.unresolved} unresolved`];

  return parts.join(SEPARATOR);
};

/** "<external> external · <assets> assets · <self> self", the status line's tooltip. */
export const moduleTooltipOf = (found: ModulesFound): string => {
  const { external, assets, self } = found.counts;
  const parts = [`${external} external`, `${assets} assets`, `${self} self`];

  return parts.join(SEPARATOR);
};

/** The banner of an empty or partial scan (spec §7.4): the limit's sentence, then the dropped count; `null` for a whole scan. */
export const moduleBannerOf = (found: ModulesFound): string | null => {
  const { limit, dropped } = found;
  const isWhole = limit === null && dropped === 0;

  if (found.files.length === 0) return NO_MODULE_FILES_TEXT;

  if (isWhole) return null;

  const lead = leadOf(limit);

  if (dropped === 0) return lead;

  const droppedText = droppedTextOf(dropped);

  return `${lead} ${droppedText}`;
};

export const moduleFailedTextOf = (name: string): string => `Could not scan ${name}.`;

export const modulesTitleOf = (name: string): string => `Modules of ${name}`;
