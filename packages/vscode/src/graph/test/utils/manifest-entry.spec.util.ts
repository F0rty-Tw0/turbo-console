import type { ManifestContext, ManifestEntry, ManifestField } from '@turbo-console/webview-ui';

export const rows = (eol: string, ...lines: string[]): string => lines.join(eol);

/** A manifest entry; `place` is its zero-based `line` and the `context` around it. */
export const entry = (
  field: ManifestField,
  key: string,
  spec: string,
  ...place: [line: number, context: ManifestContext]
): ManifestEntry => {
  const [line, context] = place;
  const found: ManifestEntry = { field, key, spec, line, context };

  return found;
};
