import { GENERATED_BLOCK_LINES, GENERATED_BLOCK_MARK } from '../common/generated-source.const.ts';

const blockOf = (index: number): string => {
  const text = GENERATED_BLOCK_LINES.join('\n');
  const marked = text.replaceAll(GENERATED_BLOCK_MARK, String(index));

  return `${marked}\n`;
};

const blocksOf = (minChars: number): string[] => {
  const blocks: string[] = [];
  let length = 0;

  while (length < minChars) {
    const block = blockOf(blocks.length);

    blocks.push(block);
    length += block.length;
  }

  return blocks;
};

export const generatedSourceOf = (minChars: number): string => {
  const blocks = blocksOf(minChars);

  return blocks.join('');
};

export const generatedBlocksOf = (minChars: number): number => {
  const blocks = blocksOf(minChars);

  return blocks.length;
};
