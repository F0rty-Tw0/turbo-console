import type { Node } from 'jsonc-parser';
import { parseTree } from 'jsonc-parser';

const hasKey = (property: Node, key: string): boolean => {
  const [name, value] = property.children ?? [];

  return value !== undefined && name?.value === key;
};

/** The last property of object `node` named `key` that has a value: a repeated key resolves to its last entry, as `JSON.parse` and npm read it. */
const lastPropertyOf = (node: Node | undefined, key: string): Node | null => {
  if (node?.type !== 'object') return null;

  const children = node.children ?? [];
  const matching = children.filter((property) => hasKey(property, key));
  const last = matching.at(-1);

  return last ?? null;
};

const parsedPropertyAt = (text: string, path: string[]): Node | null => {
  let property: Node | null = null;
  let value: Node | undefined = parseTree(text);

  for (const key of path) {
    property = lastPropertyOf(value, key);
    value = property?.children?.[1];
  }

  return property;
};

/**
 * The `"key": value` property node at `path` of a JSON text: `offset` is its key's opening quote and `offset + length` the end of
 * its value; its first child is the key. A key repeated in an object resolves to its last property. `null` for no such property.
 * A parse error still leaves a tree. The parser recurses once per nesting level, so a text nested deep enough to overflow the
 * stack gives `null` instead of throwing.
 */
export const jsonPropertyAt = (text: string, path: string[]): Node | null => {
  try {
    return parsedPropertyAt(text, path);
  } catch (error) {
    if (error instanceof RangeError) return null;

    throw error;
  }
};
