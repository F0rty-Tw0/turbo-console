type KeyMatch = {
  readonly prefixLength: number;
  readonly matched: string;
  readonly targets: string[];
};

const matchOf = (specifier: string, key: string, targets: string[]): KeyMatch | null => {
  const star = key.indexOf('*');

  if (star === -1) return null;

  const prefix = key.slice(0, star);
  const suffix = key.slice(star + 1);
  const isLongEnough = specifier.length >= prefix.length + suffix.length;

  if (!isLongEnough) return null;

  const hasPrefix = specifier.startsWith(prefix);
  const hasSuffix = specifier.endsWith(suffix);

  if (!hasPrefix || !hasSuffix) return null;

  const matched = specifier.slice(prefix.length, specifier.length - suffix.length);
  const match: KeyMatch = { prefixLength: prefix.length, matched, targets };

  return match;
};

const longestMatchOf = (specifier: string, paths: Readonly<Record<string, string[]>>): KeyMatch | null => {
  let best: KeyMatch | null = null;

  for (const [key, targets] of Object.entries(paths)) {
    const match = matchOf(specifier, key, targets);

    if (match === null) continue;

    const isLonger = best === null || match.prefixLength > best.prefixLength;

    if (isLonger) best = match;
  }

  return best;
};

/**
 * The targets of the `paths` key TS picks for `specifier` (D5 rule 4): an exact key first, else the one-`*` key with the
 * longest prefix before `*` whose prefix and suffix both fit (first key on a tie), each target's `*` replaced by the text it
 * matched, or the targets as written when it matched empty text (TS `matchedStar ? replaceFirstStar : subst`); an exact
 * key's targets as written; `[]` when no key matches. Keys and targets hold at most one `*` (core filters them, D6).
 */
export const aliasTargetsOf = (specifier: string, paths: Readonly<Record<string, string[]>>): string[] => {
  const exact = Object.hasOwn(paths, specifier) ? paths[specifier] : undefined;

  if (exact !== undefined) return [...exact];

  const best = longestMatchOf(specifier, paths);

  if (best === null) return [];

  const matched = best.matched;
  const isEmptyMatch = matched === '';

  if (isEmptyMatch) return [...best.targets];

  const substitute = (target: string): string => target.replace('*', () => matched);

  return best.targets.map(substitute);
};
