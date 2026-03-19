import type { Plugin } from '@elizaos/core';
import { suggestOpsCommandAction, useOpsChatAction } from './actions/suggestOpsCommand.js';
import { executionIntentPolicy } from './evaluators/executionIntentPolicy.js';
import { guardrailsProvider } from './providers/guardrailsProvider.js';
import { knowledgeProvider } from './providers/knowledgeProvider.js';
import { priceProvider } from './providers/priceProvider.js';
import { signalsProvider } from './providers/signalsProvider.js';
import { statusProvider } from './providers/statusProvider.js';
import { websiteProvider } from './providers/websiteProvider.js';

export const blaqReadonlyPlugin: Plugin = {
  name: 'blaq-readonly',
  description: 'Read-only local knowledge, status, guardrails, signal, price, and official-site context for Blaq Ceaser. Providers are context-only, not actions.',
  actions: [suggestOpsCommandAction, useOpsChatAction],
  providers: [knowledgeProvider, signalsProvider, priceProvider, statusProvider, guardrailsProvider, websiteProvider],
  evaluators: [executionIntentPolicy],
  services: [],
};

export default blaqReadonlyPlugin;
