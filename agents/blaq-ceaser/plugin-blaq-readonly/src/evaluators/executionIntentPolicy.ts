import { EXECUTION_INTENT_PATTERN } from '../executionIntent';

const EXECUTION_REFUSAL =
  'I only explain. Ops bot executes. Use Ops chat.';

export const executionIntentPolicy = {
  name: 'EXECUTION_INTENT_POLICY',
  description: 'Blocks execution intent and routes the user back to Ops.',
  validate: async (_runtime: unknown, message: { content?: { text?: string } }) => {
    const text = message.content?.text ?? '';
    return EXECUTION_INTENT_PATTERN.test(text);
  },
  handler: async () => {
    return {
      text: EXECUTION_REFUSAL,
      success: true,
      data: {
        blocked: true,
        reason: 'execution_intent',
      },
    };
  },
};
