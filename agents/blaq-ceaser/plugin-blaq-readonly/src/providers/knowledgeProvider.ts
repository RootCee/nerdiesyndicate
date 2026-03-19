import { findKnowledgeMatches } from './knowledgeReader';

function buildKnowledgeUnavailablePayload() {
  const text =
    'Local project knowledge did not find a clean match for that question. Keep the answer short and honest.';

  return {
    text,
    values: {
      unavailable: true,
      reason: text,
    },
    data: {
      unavailable: true,
      reason: text,
    },
  };
}

export const knowledgeProvider = {
  name: 'BLAQ_KNOWLEDGE_CONTEXT',
  description:
    'Context-only provider for local file-first project and identity knowledge. Never use this as an action.',
  dynamic: true,
  get: async (_runtime: unknown, message?: { content?: { text?: string } }) => {
    const userText = message?.content?.text ?? '';
    const matches = findKnowledgeMatches(userText);

    if (!matches.length) {
      return buildKnowledgeUnavailablePayload();
    }

    const text = [
      '[LOCAL KNOWLEDGE CONTEXT]',
      `User question: ${userText || 'unknown'}`,
      'Instruction: answer this identity or project question from the local knowledge files first.',
      'Prefer these file facts over generic prompt memory.',
      ...matches.map((match) => `[${match.title}]\n${match.body}`),
    ].join('\n\n');

    return {
      text,
      values: {
        matches: matches.map((match) => ({ title: match.title, slug: match.slug })),
      },
      data: {
        matches,
      },
    };
  },
};
