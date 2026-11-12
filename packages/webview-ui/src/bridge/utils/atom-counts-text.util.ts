import type { GraphAtomCounts } from '../common/graph-message.type.ts';

/** The counts line of an umbrella: `<files> files`, then `<cached> cached` once the dry run settled, then `<failed> failed` when any failed. */
export const atomCountsText = (counts: GraphAtomCounts): string => {
  const { files, cached, failed } = counts;
  const parts = [`${String(files)} files`];

  if (cached !== null) parts.push(`${String(cached)} cached`);

  if (failed !== null && failed > 0) parts.push(`${String(failed)} failed`);

  return parts.join(' · ');
};
