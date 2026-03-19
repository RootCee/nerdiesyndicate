import { formatWebsiteProviderOutput } from './formatters';
import { fetchOfficialSiteSnapshot } from './websiteReader';

const WEBSITE_DEBUG_PREFIX = '[blaq-website-debug]';

function buildWebsiteUnavailablePayload(reason: string) {
  const boundedReason = `Mi couldn't read the site right now, bredren, but the official link is https://nerdieblaq.xyz. (${reason})`;

  return {
    text: boundedReason,
    values: {
      unavailable: true,
      reason: boundedReason,
    },
    data: {
      unavailable: true,
      reason: boundedReason,
    },
  };
}

export const websiteProvider = {
  name: 'BLAQ_WEBSITE_CONTEXT',
  description:
    'Context-only provider for the official Nerdie Blaq website at https://nerdieblaq.xyz. Never use this as an action.',
  dynamic: true,
  get: async (_runtime: unknown, message?: { content?: { text?: string } }) => {
    const userText = message?.content?.text ?? '';

    try {
      console.log(`${WEBSITE_DEBUG_PREFIX} provider_selected=true question="${userText}"`);
      console.log(`${WEBSITE_DEBUG_PREFIX} fetch_started`);
      const snapshot = await fetchOfficialSiteSnapshot();
      console.log(`${WEBSITE_DEBUG_PREFIX} fetch_completed url="${snapshot.url}"`);
      const payload = formatWebsiteProviderOutput(snapshot, userText);
      console.log(
        `${WEBSITE_DEBUG_PREFIX} summary_produced=${Boolean(snapshot.homepageSummary)} links=${snapshot.visibleLinks.length}`
      );
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Website unavailable.';
      console.log(`${WEBSITE_DEBUG_PREFIX} provider_error="${message}"`);
      return buildWebsiteUnavailablePayload(message);
    }
  },
};
