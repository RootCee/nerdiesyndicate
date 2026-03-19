export type FallbackReplyContext = {
  rawText: string;
  websiteModeMatched: boolean;
  priceModeMatched: boolean;
  socialMode?: boolean;
};

export function selectFallbackReply(context: FallbackReplyContext) {
  if (context.socialMode) {
    return 'Wah gwan, bredren. Mi deh yah steady. Wah pon yuh mind?';
  }

  if (context.websiteModeMatched) {
    return "Mi couldn't read the site right now, bredren, but the official link is https://nerdieblaq.xyz.";
  }

  if (context.priceModeMatched) {
    return 'Mi nah have a solid board read pon dat yet.';
  }

  if (context.rawText.trim()) {
    return 'Mi cyaan pull dat clean right now, try ask it different.';
  }

  return 'Bomboclaat, mi nah get a clean read pon dat right now.';
}
