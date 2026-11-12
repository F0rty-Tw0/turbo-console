import type { NodeSize } from '../../common/node-size.type.ts';

/** A node sizer 10 px wide per character of `text` and 32 px tall, so a longer text gets a wider box. */
export const lengthSizeOf = (text: string): NodeSize => {
  const size: NodeSize = { width: text.length * 10, height: 32 };

  return size;
};
