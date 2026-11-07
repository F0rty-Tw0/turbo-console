type LinkMessage = { readonly source: string; readonly target: string };

/** A predicate for the messages that name the link from `source` to `target`. */
export const isLinkOf = <Message extends LinkMessage>(source: string, target: string): ((message: Message) => boolean) => {
  const isLink = (message: Message): boolean => message.source === source && message.target === target;

  return isLink;
};
