import type { Character } from '@elizaos/core';
import blaqReadonlyPlugin from '@nerdieblaq/plugin-blaq-readonly';
import character from './character.js';
import { formatKnowledgePack, nerdieBlaqKnowledgePack } from './knowledge-pack.js';

export interface BlaqCeaserShellConfig {
  modelProvider: string | null;
  modelName: string | null;
  readOnly: true;
  executionAuthority: 'ops-bot';
  telegram: {
    enabled: boolean;
    tokenConfigured: boolean;
    note: string;
  };
}

export interface BlaqCeaserAppShell {
  character: Character;
  plugins: unknown[];
  config: BlaqCeaserShellConfig;
  notes: string[];
}

function toNullable(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export function createBlaqCeaserAppShell(): BlaqCeaserAppShell {
  const modelProvider = toNullable(process.env.MODEL_PROVIDER);
  const modelName = toNullable(process.env.MODEL_NAME);
  const telegramToken = toNullable(process.env.TELEGRAM_BOT_TOKEN);
  const projectKnowledge = formatKnowledgePack(nerdieBlaqKnowledgePack);

  return {
    character: {
      ...character,
      knowledge: nerdieBlaqKnowledgePack,
      system: `${character.system}\n\nProject knowledge:\n${projectKnowledge}`,
      settings: {
        ...((character.settings as Record<string, unknown> | undefined) ?? {}),
        readOnly: true,
        executionAuthority: 'ops-bot',
        modelProvider,
        modelName,
      },
    },
    plugins: [blaqReadonlyPlugin],
    config: {
      modelProvider,
      modelName,
      readOnly: true,
      executionAuthority: 'ops-bot',
      telegram: {
        enabled: false,
        tokenConfigured: Boolean(telegramToken),
        note: 'Telegram connector intentionally not wired yet. Add later when the real Eliza runtime is installed.',
      },
    },
    notes: [
      'This is a minimal runtime shell only.',
      'No execution, trading, wallet, or confirmation capability is exposed here.',
      'Connect a real Eliza runtime later and register the local read-only plugin there.',
    ],
  };
}
