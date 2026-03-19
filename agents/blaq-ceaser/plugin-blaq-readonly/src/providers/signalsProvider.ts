import { getLatestSignalSnapshot } from '@nerdieblaq/shared-readonly';
import { formatSignalsProviderOutput } from './formatters';
import { buildUnavailableProviderPayload } from './providerUtils';

export const signalsProvider = {
  name: 'BLAQ_SIGNAL_CONTEXT',
  description: 'Context-only provider for the latest read-only signals and market summary. Never use this as an action.',
  dynamic: true,
  get: async (_runtime: unknown, message?: { content?: { text?: string } }) => {
    const userText = message?.content?.text ?? '';

    try {
      const result = await getLatestSignalSnapshot();
      return formatSignalsProviderOutput(result, userText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signals unavailable.';
      return buildUnavailableProviderPayload('Signals', message);
    }
  },
};
