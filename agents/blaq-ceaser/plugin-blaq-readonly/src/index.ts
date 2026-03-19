import type { Plugin } from '@elizaos/core';
import { suggestOpsCommandAction, useOpsChatAction } from './actions/suggestOpsCommand';
import { executionIntentPolicy } from './evaluators/executionIntentPolicy';
import { guardrailsProvider } from './providers/guardrailsProvider';
import { knowledgeProvider } from './providers/knowledgeProvider';
import { priceProvider } from './providers/priceProvider';
import { signalsProvider } from './providers/signalsProvider';
import { statusProvider } from './providers/statusProvider';
import { websiteProvider } from './providers/websiteProvider';

export const blaqReadonlyPlugin: Plugin = {
  name: 'blaq-readonly',
  description: 'Read-only local knowledge, status, guardrails, signal, price, and official-site context for Blaq Ceaser. Providers are context-only, not actions.',
  actions: [suggestOpsCommandAction, useOpsChatAction],
  providers: [knowledgeProvider, signalsProvider, priceProvider, statusProvider, guardrailsProvider, websiteProvider],
  evaluators: [executionIntentPolicy],
  services: [],
};

export default blaqReadonlyPlugin;
