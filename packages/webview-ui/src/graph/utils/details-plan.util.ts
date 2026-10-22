import type { DetailsPlan } from '../common/graph-details.type.ts';
import type { Inspection } from '../common/inspection.type.ts';

/** The kind and the names an inspection is told apart by; a picking's nudge is left out. */
const identityOf = (inspection: Inspection): string[] => {
  switch (inspection.kind) {
    case 'none':
      return [inspection.kind];
    case 'package':
      return [inspection.kind, inspection.name];
    case 'link':
      return [inspection.kind, inspection.source, inspection.target];
    case 'picking':
      return [inspection.kind, inspection.start];
    case 'trace':
      return [inspection.kind, inspection.start, inspection.end];
  }
};

const isSameInspection = (previous: Inspection, next: Inspection): boolean => {
  const before = identityOf(previous);
  const after = identityOf(next);
  const isSameLength = before.length === after.length;

  return isSameLength && before.every((part, index) => part === after[index]);
};

/** `update` for the inspection shown, `rebuild` for it on a rebuild, `swap` for any other or with nothing shown. */
export const detailsPlanOf = (previous: Inspection | null, next: Inspection, isRebuild: boolean): DetailsPlan => {
  if (previous === null) return 'swap';

  const isSame = isSameInspection(previous, next);

  if (!isSame) return 'swap';

  if (isRebuild) return 'rebuild';

  return 'update';
};
