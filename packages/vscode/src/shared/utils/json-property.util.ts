import type { Node } from 'jsonc-parser';
import { findNodeAtLocation, parseTree } from 'jsonc-parser';

/** `findNodeAtLocation` returns the value node; the property, key first, is its parent. */
const propertyOfValue = (value: Node | undefined): Node | null => {
  const property = value?.parent;

  if (property?.type !== 'property') return null;

  return property;
};

const parsedPropertyAt = (text: string, path: string[]): Node | null => {
  const tree = parseTree(text);

  if (tree === undefined) return null;

  const value = findNodeAtLocation(tree, path);

  return propertyOfValue(value);
};

/**
 * The `"key": value` property node at `path` of a JSON text: `offset` is its key's opening quote and `offset + length` the end of
 * its value; its first child is the key. `null` for no such property. A parse error still leaves a tree. The parser recurses once
 * per nesting level, so a text nested deep enough to overflow the stack gives `null` instead of throwing.
 */
export const jsonPropertyAt = (text: string, path: string[]): Node | null => {
  try {
    return parsedPropertyAt(text, path);
  } catch (error) {
    if (error instanceof RangeError) return null;

    throw error;
  }
};
