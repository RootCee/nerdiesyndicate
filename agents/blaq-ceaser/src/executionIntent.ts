export const EXECUTION_INTENT_PATTERN =
  /(^\s*(buy|sell|close|confirm|execute|override|reset)\b)|(\b(sell now|trade now|force trade|close position|confirm (it|this|trade|order|position)|reset stats|override (guardrails|safeguards|limits)|execute (trade|order|position)|buy [A-Z0-9/_-]+(?:\s+now)?|sell [A-Z0-9/_-]+(?:\s+now)?)\b)/i;

export function isExecutionIntent(text: string) {
  return EXECUTION_INTENT_PATTERN.test(text);
}
