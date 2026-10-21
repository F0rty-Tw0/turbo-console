import { ENTRY_TEXT_MAX, MANIFEST_ENTRIES_MAX, MANIFEST_FIELDS } from '@turbo-console/webview-ui';
import type { ManifestEntry, ManifestField } from '@turbo-console/webview-ui';
import { parseTree } from 'jsonc-parser';
import type { Node } from 'jsonc-parser';

import { lineAt } from '../../shared/utils/text-line.util.ts';

const BOM = '﻿';

const ALIAS_PREFIXES = ['npm:', 'workspace:'];

const stringValueOf = (node: Node | undefined): string | null => {
  if (node === undefined) return null;

  if (typeof node.value !== 'string') return null;

  return node.value;
};

const withoutBom = (text: string): string => {
  const hasBom = text.startsWith(BOM);

  if (!hasBom) return text;

  return text.slice(BOM.length);
};

const cut = (text: string): string => {
  if (text.length <= ENTRY_TEXT_MAX) return text;

  return `${text.slice(0, ENTRY_TEXT_MAX)}…`;
};

const isAliasOf = (spec: string | null, dependency: string): boolean => {
  if (spec === null) return false;

  const isAliasPrefix = (prefix: string): boolean => spec === `${prefix}${dependency}` || spec.startsWith(`${prefix}${dependency}@`);

  return ALIAS_PREFIXES.some(isAliasPrefix);
};

const fieldObjectOf = (root: Node, field: ManifestField): Node | null => {
  const isFieldObject = (property: Node): boolean => {
    const [key, value] = property.children ?? [];

    return stringValueOf(key) === field && value?.type === 'object';
  };
  const property = root.children?.find(isFieldObject);

  return property?.children?.[1] ?? null;
};

const entryOf = (field: ManifestField, property: Node, body: string, dependency: string): ManifestEntry | null => {
  const [keyNode, valueNode] = property.children ?? [];

  if (keyNode === undefined || valueNode === undefined) return null;

  const key = stringValueOf(keyNode);
  const text = stringValueOf(valueNode);
  const isNamed = key === dependency;
  const isAlias = isAliasOf(text, dependency);

  const isMatch = isNamed || isAlias;

  if (key === null || !isMatch) return null;

  const spec = text ?? body.slice(valueNode.offset, valueNode.offset + valueNode.length);
  const entry: ManifestEntry = { field, key: cut(key), spec: cut(spec), line: lineAt(body, keyNode.offset) };

  return entry;
};

const entriesOfField = (field: ManifestField, root: Node, body: string, dependency: string): ManifestEntry[] => {
  const fieldObject = fieldObjectOf(root, field);
  const entries: ManifestEntry[] = [];

  for (const property of fieldObject?.children ?? []) {
    const entry = entryOf(field, property, body, dependency);

    if (entry !== null) entries.push(entry);
  }

  return entries;
};

const parsedRootOf = (body: string): Node | null => {
  try {
    const tree = parseTree(body);

    return tree?.type === 'object' ? tree : null;
  } catch (error) {
    if (error instanceof RangeError) return null;

    throw error;
  }
};

/**
 * The entries of `text`, a `package.json`, that name `dependency` in `MANIFEST_FIELDS`, in field order, by key or as an
 * `npm:` or `workspace:` alias, at most `MANIFEST_ENTRIES_MAX`; `[]` when none does (missing) and `null` when the text has no
 * object root or nests too deep to parse (unreadable). A parse error inside an object root still gives a result. Names are
 * compared on parsed nodes, never looked up on an object.
 */
export const manifestEntriesOf = (text: string, dependency: string): ManifestEntry[] | null => {
  const body = withoutBom(text);
  const root = parsedRootOf(body);

  if (root === null) return null;

  const entries = MANIFEST_FIELDS.flatMap((field): ManifestEntry[] => entriesOfField(field, root, body, dependency));

  return entries.slice(0, MANIFEST_ENTRIES_MAX);
};
