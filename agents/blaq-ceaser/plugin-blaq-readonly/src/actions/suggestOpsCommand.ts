import { isExecutionIntent } from '../executionIntent';

const COMMAND_MAP: Array<{ pattern: RegExp; command: string }> = [
  { pattern: /\b(buy|long)\b/i, command: '/buy_review <asset>' },
  { pattern: /\b(sell|short|close)\b/i, command: '/sell_review <asset>' },
  { pattern: /\b(status|health|heartbeat)\b/i, command: '/status' },
  { pattern: /\b(guardrail|risk|limits?)\b/i, command: '/guardrails' },
];

function suggestCommand(text: string): string {
  const match = COMMAND_MAP.find((entry) => entry.pattern.test(text));
  return match?.command ?? '/status';
}

export const suggestOpsCommandAction = {
  name: 'SUGGEST_OPS_COMMAND',
  description: 'Suggests an Ops bot command without executing anything.',
  validate: async (_runtime: unknown, message: { content?: { text?: string } }) => {
    const text = message.content?.text ?? '';
    return isExecutionIntent(text);
  },
  handler: async (_runtime: unknown, message: { content?: { text?: string } }) => {
    const text = message.content?.text ?? '';
    const command = suggestCommand(text);

    return {
      text: `I only explain. Ops bot executes. Use Ops chat. Suggested command: ${command}`,
      success: true,
      data: { command, readOnly: true },
    };
  },
};

export const useOpsChatAction = {
  name: 'USE_OPS_CHAT',
  description: 'Routes the user back to Ops chat for any execution-related follow-up.',
  validate: async (_runtime: unknown, message: { content?: { text?: string } }) => {
    const text = message.content?.text ?? '';
    return isExecutionIntent(text);
  },
  handler: async () => {
    return {
      text: 'I only explain. Ops bot executes. Use Ops chat.',
      success: true,
      data: {
        route: 'ops-chat',
        readOnly: true,
      },
    };
  },
};
