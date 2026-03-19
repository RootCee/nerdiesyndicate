import { getGuardrailState } from '@nerdieblaq/shared-readonly';
import { formatGuardrailsProviderOutput } from './formatters.js';
import { buildUnavailableProviderPayload } from './providerUtils.js';

export const guardrailsProvider = {
  name: 'BLAQ_GUARDRAILS_CONTEXT',
  description: 'Context-only provider for read-only guardrail state. Never use this as an action.',
  dynamic: true,
  get: async (_runtime: unknown, message?: { content?: { text?: string } }) => {
    const userText = message?.content?.text ?? '';

    try {
      const guardrails = await getGuardrailState();
      return formatGuardrailsProviderOutput(guardrails, userText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Guardrails unavailable.';
      return buildUnavailableProviderPayload('Guardrails', message);
    }
  },
};
