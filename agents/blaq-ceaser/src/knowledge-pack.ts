export type KnowledgeEntry = {
  title: string;
  summary: string;
  bullets: string[];
};

export const nerdieBlaqKnowledgePack: KnowledgeEntry[] = [
  {
    title: 'Nerdie Blaq Overview',
    summary:
      'Nerdie Blaq is a builder ecosystem around trading automation, operator tooling, AI personalities, and community-facing products.',
    bullets: [
      'Nerdie Blaq Ops is the execution authority.',
      'gdex.skill handles signal and trading logic.',
      'Blaq Ceaser is the read-only conversational layer.',
      'The official site is https://nerdieblaq.xyz.',
      'The site is part of the broader community, product, and ecosystem presence.',
    ],
  },
  {
    title: 'Nerdie Blaq Ops',
    summary:
      'Nerdie Blaq Ops owns review, confirm, and execution authority for operational actions.',
    bullets: [
      'Ops enforces guardrails and execution control.',
      'Ops is the only path for trades, resets, and confirmations.',
      'Blaq Ceaser must route action requests back to Ops.',
    ],
  },
  {
    title: 'Bots And Roles',
    summary:
      'The ecosystem separates signal logic, execution authority, and conversational explanation into different roles.',
    bullets: [
      'gdex.skill produces signal and trading context.',
      'Ops bot executes under guardrails.',
      'Blaq Ceaser explains, summarizes, and suggests safe commands.',
    ],
  },
  {
    title: 'Mission',
    summary:
      'The mission is to build disciplined, anti-scam operator tooling around trading intelligence and AI-guided interfaces.',
    bullets: [
      'Facts before hype.',
      'Guardrails before impulse.',
      'Clear workflows over reckless automation.',
    ],
  },
  {
    title: 'FAQ',
    summary:
      'Blaq Ceaser can explain the project, bots, and live read-only bot state, but cannot execute trades.',
    bullets: [
      'Nerdie Blaq is the broader ecosystem.',
      'Nerdie Blaq Ops is the execution layer.',
      'Blaq Ceaser is read-only and suggestion-only.',
      'The official website is https://nerdieblaq.xyz.',
    ],
  },
];

export function formatKnowledgePack(entries: KnowledgeEntry[]): string {
  return entries
    .map(
      (entry) =>
        `[${entry.title}]\nSummary: ${entry.summary}\n- ${entry.bullets.join('\n- ')}`
    )
    .join('\n\n');
}
