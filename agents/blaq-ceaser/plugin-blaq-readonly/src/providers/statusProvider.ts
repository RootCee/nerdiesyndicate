import { getBotStatus, getGuardrailState, getLatestSignals, getPerformanceSummary } from '@nerdieblaq/shared-readonly';
import { formatStatusProviderOutput } from './formatters';
import { buildUnavailableProviderPayload } from './providerUtils';

export const statusProvider = {
  name: 'BLAQ_STATUS_CONTEXT',
  description: 'Context-only provider for read-only bot status and performance. Never use this as an action.',
  dynamic: true,
  get: async (_runtime: unknown, message?: { content?: { text?: string } }) => {
    const userText = message?.content?.text ?? '';

    try {
      const [status, performance, guardrails, signals] = await Promise.all([
        getBotStatus(),
        getPerformanceSummary(),
        getGuardrailState(),
        getLatestSignals(),
      ]);
      return formatStatusProviderOutput(status, performance, guardrails, signals, userText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Status unavailable.';
      return buildUnavailableProviderPayload('Status', message);
    }
  },
};
