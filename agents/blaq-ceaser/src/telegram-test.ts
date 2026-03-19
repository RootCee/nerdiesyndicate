import { createBlaqCeaserAppShell } from './runtime-shell';
import { selectFallbackReply } from './fallbackReply';
import { buildRouteInstruction, routeMessage, type ConversationRoute } from './routeMessage';

const TELEGRAM_TEST_AGENT_ID = '00000000-0000-4000-8000-000000000004';
const EXECUTION_BLOCKERS = ['wallet', 'trade', 'execute', 'confirm'];
const TELEGRAM_GROUP_MENTION = '@blaqceaser_bot';
const SOCIAL_MEMORY_PREFIX = '[SOCIAL_MEMORY]';
const ROUTE_INSTRUCTION_PREFIX = '[ROUTE_INSTRUCTION]';
const FALLBACK_HINT_PREFIX = '[FALLBACK_HINT]';
const CONVERSATION_WINDOW_MS = 120000;
const WEBSITE_DEBUG_PREFIX = '[blaq-website-debug]';
const PRICE_DEBUG_PREFIX = '[blaq-price-debug]';
const KNOWLEDGE_DEBUG_PREFIX = '[blaq-knowledge-debug]';
const TELEGRAM_SEND_DEBUG_PREFIX = '[blaq-telegram-send-debug]';
const TELEGRAM_INCOMING_DEBUG_PREFIX = '[blaq-telegram-incoming-debug]';
const TELEGRAM_REPLY_GRACE_MS = 30000;
const VALID_ACTIONS = new Set(['REPLY', 'IGNORE', 'NONE', 'SUGGEST_OPS_COMMAND', 'USE_OPS_CHAT']);

type TelegramMessageEntity = {
  type?: string;
  offset?: number;
  length?: number;
};

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id?: number;
  message_thread_id?: number;
  text?: string;
  caption?: string;
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
  from?: TelegramUser;
  reply_to_message?: {
    from?: TelegramUser;
  };
};

type SocialMemoryRecord = {
  userId: string;
  username?: string;
  displayName: string;
  firstSeenAt: string;
  lastSeenAt: string;
  shortNote?: string;
};

type ConversationState = {
  userId: string;
  lastInteraction: number;
};

const socialMemory = new Map<string, SocialMemoryRecord>();
const conversationState = new Map<string, ConversationState>();

function getAllowedTelegramThreadIds(): string[] {
  const raw = process.env.TELEGRAM_ALLOWED_TEST_THREAD_ID ?? '';

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function ensureReadonlyBoundary() {
  const shell = createBlaqCeaserAppShell();
  const pluginNames = shell.character.plugins ?? [];
  const flattened = pluginNames.map((value) => String(value).toLowerCase());

  if (!shell.config.readOnly || shell.config.executionAuthority !== 'ops-bot') {
    throw new Error('Blaq Ceaser must remain read-only with Ops as execution authority.');
  }

  const blockedPlugin = flattened.find((name) =>
    EXECUTION_BLOCKERS.some((term) => name.includes(term))
  );

  if (blockedPlugin) {
    throw new Error(`Unsafe plugin detected in character config: ${blockedPlugin}`);
  }

  return shell;
}

async function loadElizaRuntime() {
  return import('@elizaos/core');
}

async function loadRuntimePlugins() {
  const [
    { default: bootstrapPlugin },
    { default: openaiPlugin },
    { default: telegramPlugin, MessageManager },
  ] = await Promise.all([
    import('@elizaos/plugin-bootstrap'),
    import('@elizaos/plugin-openai'),
    import('@elizaos/plugin-telegram'),
  ]);

  installTelegramMentionFilter(MessageManager);

  return [bootstrapPlugin, openaiPlugin, telegramPlugin];
}

function installTelegramMentionFilter(MessageManager: {
  prototype: {
    handleMessage: (ctx: {
      chat?: { id?: number | string; type?: string };
      message?: TelegramMessage;
    }) => Promise<void>;
  };
}) {
  const prototype = MessageManager.prototype as {
    __blaqMentionFilterInstalled?: boolean;
    handleMessage: (ctx: {
      chat?: { id?: number | string; type?: string };
      message?: TelegramMessage;
      content?: { mentionContext?: Record<string, unknown> };
    }) => Promise<void>;
  };

  if (prototype.__blaqMentionFilterInstalled) return;

  const originalHandleMessage = prototype.handleMessage;

  prototype.handleMessage = async function patchedHandleMessage(ctx) {
    const chatType = ctx.chat?.type;
    const message = ctx.message;
    const rawText = message?.text ?? message?.caption ?? '';
    const textPreview = rawText.slice(0, 160);
    const allowedThreadIds = getAllowedTelegramThreadIds();
    const messageThreadId = message?.message_thread_id != null ? String(message.message_thread_id) : '';
    const routeResult = routeMessage(rawText);
    const route = routeResult.route;
    const websiteModeMatched = routeResult.websiteMode;
    const priceModeMatched = routeResult.priceMode;
    const knowledgeModeMatched = routeResult.knowledgeMode;
    const nonSocialQuestion = routeResult.nonSocial;

    console.log(
      `${TELEGRAM_INCOMING_DEBUG_PREFIX} chat_id=${ctx.chat?.id ?? 'unknown'} chat_type=${chatType ?? 'unknown'} thread_id=${message?.message_thread_id ?? 'none'} from_id=${message?.from?.id ?? 'unknown'} text_preview=${JSON.stringify(textPreview)}`
    );

    if (chatType && chatType !== 'private' && allowedThreadIds.length > 0) {
      const inAllowedThread = !!messageThreadId && allowedThreadIds.includes(messageThreadId);

      if (!inAllowedThread) {
        return;
      }
    }

    if (chatType && chatType !== 'private') {
      const hasMention = hasTelegramMention(message, rawText);
      const isReply = isReplyToBlaqCeaser(message);
      const inConversationWindow = isWithinConversationWindow(message?.from);
      const shouldRespond = hasMention || isReply || inConversationWindow;

      if (!shouldRespond) {
        return;
      }

      if (!message) {
        return originalHandleMessage.call(this, ctx);
      }

      if (hasMention || isReply || inConversationWindow) {
        touchConversationWindow(message.from);
      }
    }

    if (websiteModeMatched) {
      console.log(
        `${WEBSITE_DEBUG_PREFIX} mode_trigger_matched=true source=telegram question="${rawText}"`
      );
    }

    if (priceModeMatched) {
      console.log(
        `${PRICE_DEBUG_PREFIX} mode_trigger_matched=true source=telegram question="${rawText}"`
      );
    }

    if (knowledgeModeMatched) {
      console.log(
        `${KNOWLEDGE_DEBUG_PREFIX} mode_trigger_matched=true source=telegram question="${rawText}"`
      );
    }

    applyRouteInstruction(message, rawText, routeResult);
    applyFallbackHint(message, rawText);
    applySocialMemoryHint(message, rawText, route);
    const manager = this as {
      runtime?: {
        hasElizaOS?: () => boolean;
        processActions?: (
          message: unknown,
          responses: Array<{ content?: { actions?: string[]; text?: string } }>,
          state: unknown,
          callback: (content: { text?: string; actions?: string[] }) => Promise<unknown>,
          processOptions?: unknown
        ) => Promise<unknown>;
        elizaOS?: {
          handleMessage?: (
            agentId: string,
            memory: unknown,
            options?: {
              onResponse?: (content: { text?: string; actions?: string[] }) => Promise<void>;
            }
          ) => Promise<unknown>;
        };
      };
      sendMessageInChunks?: (
        ctx: { chat?: { id?: number | string } },
        content: { text: string },
        replyToMessageId?: number
      ) => Promise<unknown>;
      sendMessage?: (
        chatId: number | string,
        content: { text: string },
        replyToMessageId?: number
      ) => Promise<unknown>;
      bot?: {
        telegram?: {
          sendMessage?: (
            chatId: number | string,
            text: string,
            options?: Record<string, unknown>
          ) => Promise<unknown>;
        };
      };
    };
    const originalSendMessageInChunks = manager.sendMessageInChunks?.bind(manager);
    const originalSendMessage = manager.sendMessage?.bind(manager);
    const runtime = manager.runtime;
    const originalProcessActions = runtime?.processActions?.bind(runtime);
    const originalElizaHandleMessage = runtime?.elizaOS?.handleMessage?.bind(runtime.elizaOS);
    let sentReply = false;
    let capturedResponseText = '';
    let resolveReplyAttempt: (() => void) | null = null;
    const replyAttempt = new Promise<void>((resolve) => {
      resolveReplyAttempt = resolve;
    });
    const restoreSendMethods = () => {
      if (originalSendMessageInChunks) {
        manager.sendMessageInChunks = originalSendMessageInChunks;
      }
      if (originalSendMessage) {
        manager.sendMessage = originalSendMessage;
      }
      if (runtime?.elizaOS && originalElizaHandleMessage) {
        runtime.elizaOS.handleMessage = originalElizaHandleMessage;
      }
      if (runtime && originalProcessActions) {
        runtime.processActions = originalProcessActions;
      }
    };

    const markReplyAttempted = (wasSent: boolean) => {
      sentReply = sentReply || wasSent;
      if (resolveReplyAttempt) {
        resolveReplyAttempt();
        resolveReplyAttempt = null;
      }
    };

    if (originalSendMessageInChunks) {
      manager.sendMessageInChunks = async (...args) => {
        const [, content, replyToMessageId] = args;
        const preview = content?.text?.slice(0, 160) ?? '';
        console.log(
          `${TELEGRAM_SEND_DEBUG_PREFIX} send_chunks_called=true reply_to=${replyToMessageId ?? 'none'} text_preview=${JSON.stringify(preview)}`
        );
        const result = await originalSendMessageInChunks(...args);
        const sentCount = Array.isArray(result) ? result.length : 0;
        markReplyAttempted(sentCount > 0);
        console.log(
          `${TELEGRAM_SEND_DEBUG_PREFIX} send_chunks_completed=true sent_count=${sentCount}`
        );
        return result;
      };
    }

    if (originalSendMessage) {
      manager.sendMessage = async (...args) => {
        const [chatId, content, replyToMessageId] = args;
        const preview = content?.text?.slice(0, 160) ?? '';
        console.log(
          `${TELEGRAM_SEND_DEBUG_PREFIX} send_message_called=true chat_id=${chatId} reply_to=${replyToMessageId ?? 'none'} text_preview=${JSON.stringify(preview)}`
        );
        const result = await originalSendMessage(...args);
        const sentCount = Array.isArray(result) ? result.length : result ? 1 : 0;
        markReplyAttempted(sentCount > 0);
        console.log(
          `${TELEGRAM_SEND_DEBUG_PREFIX} send_message_completed=true sent_count=${sentCount}`
        );
        return result;
      };
    }

    if (runtime?.elizaOS && originalElizaHandleMessage) {
      runtime.elizaOS.handleMessage = async (agentId, memory, options) => {
        const wrappedOptions = {
          ...options,
          onResponse: async (content: { text?: string; actions?: string[] }) => {
            capturedResponseText = content?.text ?? '';
            console.log(
              `${TELEGRAM_SEND_DEBUG_PREFIX} captured_model_reply=true text_preview=${JSON.stringify(capturedResponseText.slice(0, 160))}`
            );
            await options?.onResponse?.(content);
          },
        };

        return originalElizaHandleMessage(agentId, memory, wrappedOptions);
      };
    }

    if (runtime && originalProcessActions) {
      runtime.processActions = async (message, responses, state, callback, processOptions) => {
        const sanitizedResponses = responses.map((response) => {
          const originalActions = response.content?.actions ?? [];
          const sanitizedActions = sanitizeActionsForRoute(originalActions, route);

          if (
            originalActions.length > 0 &&
            originalActions.join(',') !== sanitizedActions.join(',')
          ) {
            console.log(
              `${TELEGRAM_SEND_DEBUG_PREFIX} sanitized_actions=true route=${route} original=${JSON.stringify(originalActions)} sanitized=${JSON.stringify(sanitizedActions)}`
            );
          }

          return {
            ...response,
            content: {
              ...response.content,
              actions: sanitizedActions,
            },
          };
        });

        const canBypassActionProcessing =
          route !== 'social' &&
          sanitizedResponses.length > 0 &&
          sanitizedResponses.every((response) => {
            const actions = response.content?.actions ?? [];
            const text = response.content?.text ?? '';
            return actions.length === 1 && actions[0] === 'REPLY' && text.trim().length > 0;
          });

        if (canBypassActionProcessing) {
          console.log(
            `${TELEGRAM_SEND_DEBUG_PREFIX} bypass_action_processing=true route=${route} responses=${sanitizedResponses.length}`
          );

          for (const response of sanitizedResponses) {
            await callback({
              ...response.content,
              actions: ['REPLY'],
            });
          }

          return [];
        }

        return originalProcessActions(message, sanitizedResponses, state, callback, processOptions);
      };
    }

    let result: void;

    try {
      result = await originalHandleMessage.call(this, ctx);
    } catch (error) {
      if (nonSocialQuestion) {
        await sendFallbackReply(ctx, manager, rawText, websiteModeMatched, priceModeMatched);
        restoreSendMethods();
        return;
      }
      await sendFallbackReply(ctx, manager, rawText, websiteModeMatched, priceModeMatched, true);
      restoreSendMethods();
      return;
    }

    if (nonSocialQuestion && !sentReply) {
      await Promise.race([
        replyAttempt,
        new Promise((resolve) => setTimeout(resolve, TELEGRAM_REPLY_GRACE_MS)),
      ]);
    }

    if (nonSocialQuestion && !sentReply) {
      if (capturedResponseText.trim()) {
        console.log(
          `${TELEGRAM_SEND_DEBUG_PREFIX} direct_send_from_captured_reply=true route=${route}`
        );
        await sendDirectReply(ctx, manager, capturedResponseText);
        sentReply = true;
      }
    }

    if (nonSocialQuestion && !sentReply) {
      console.log(
        `${TELEGRAM_SEND_DEBUG_PREFIX} no_reply_detected=true route=${route} question=${JSON.stringify(rawText)}`
      );
      await sendFallbackReply(ctx, manager, rawText, websiteModeMatched, priceModeMatched);
    }

    if (!nonSocialQuestion && !sentReply) {
      console.log(
        `${TELEGRAM_SEND_DEBUG_PREFIX} no_reply_detected=true route=${route} question=${JSON.stringify(rawText)}`
      );
      await sendFallbackReply(ctx, manager, rawText, websiteModeMatched, priceModeMatched, true);
    }

    restoreSendMethods();

    if (websiteModeMatched) {
      console.log(`${WEBSITE_DEBUG_PREFIX} final_model_response_received=true`);
    }

    if (priceModeMatched) {
      console.log(`${PRICE_DEBUG_PREFIX} final_model_response_received=true`);
    }

    if (knowledgeModeMatched) {
      console.log(`${KNOWLEDGE_DEBUG_PREFIX} final_model_response_received=true`);
    }

    return result;
  };

  prototype.__blaqMentionFilterInstalled = true;
}

function hasTelegramMention(message: TelegramMessage | undefined, rawText: string): boolean {
  if (!message) return false;

  const entities = [...(message.entities ?? []), ...(message.caption_entities ?? [])];
  const hasMentionEntity = entities.some((entity) => {
    if (entity.type !== 'mention') return false;

    const entityText = getEntityText(rawText, entity);
    return entityText.toLowerCase() === TELEGRAM_GROUP_MENTION;
  });

  return hasMentionEntity || rawText.toLowerCase().includes(TELEGRAM_GROUP_MENTION);
}

function isReplyToBlaqCeaser(message: TelegramMessage | undefined): boolean {
  const replyAuthor = message?.reply_to_message?.from;

  if (!replyAuthor) {
    return false;
  }

  const replyUsername = replyAuthor.username?.trim().toLowerCase();
  const replyUserId = replyAuthor.id != null ? String(replyAuthor.id) : '';
  const configuredBotId = process.env.TELEGRAM_BOT_USER_ID?.trim();

  return (
    replyUsername === TELEGRAM_GROUP_MENTION.slice(1) ||
    (!!configuredBotId && replyUserId === configuredBotId)
  );
}

function getEntityText(source: string, entity: TelegramMessageEntity): string {
  const offset = typeof entity.offset === 'number' ? entity.offset : -1;
  const length = typeof entity.length === 'number' ? entity.length : -1;

  if (offset < 0 || length <= 0) return '';

  return source.slice(offset, offset + length);
}

function isWithinConversationWindow(user: TelegramUser | undefined): boolean {
  const key = getTelegramUserKey(user);

  if (!key) {
    return false;
  }

  const state = conversationState.get(key);

  if (!state) {
    return false;
  }

  if (Date.now() - state.lastInteraction >= CONVERSATION_WINDOW_MS) {
    conversationState.delete(key);
    return false;
  }

  return true;
}

function touchConversationWindow(user: TelegramUser | undefined) {
  const key = getTelegramUserKey(user);

  if (!key) {
    return;
  }

  conversationState.set(key, {
    userId: key,
    lastInteraction: Date.now(),
  });
}

function getTelegramUserKey(user: TelegramUser | undefined): string | null {
  return user?.id != null ? String(user.id) : null;
}

function applyRouteInstruction(
  message: TelegramMessage | undefined,
  rawText: string,
  routeResult: ReturnType<typeof routeMessage>
) {
  if (!message || !rawText || routeResult.route === 'social') {
    return;
  }

  const targetField = typeof message.text === 'string' ? 'text' : 'caption';
  const original = message[targetField];
  const instruction = buildRouteInstruction(routeResult);

  if (!original || !instruction || original.includes(ROUTE_INSTRUCTION_PREFIX)) {
    return;
  }

  message[targetField] = `${original}\n\n${instruction}`;
}

function applyFallbackHint(message: TelegramMessage | undefined, rawText: string) {
  if (!message || !rawText || routeMessage(rawText).route === 'social') {
    return;
  }

  const targetField = typeof message.text === 'string' ? 'text' : 'caption';
  const original = message[targetField];

  if (!original || original.includes(FALLBACK_HINT_PREFIX)) {
    return;
  }

  message[targetField] =
    `${original}\n\n` +
    `${FALLBACK_HINT_PREFIX}\n` +
    'If no provider result is usable, the read is muddy, the question is unclear, or you cannot answer cleanly, still return the exact XML structure.\n' +
    'Use <actions>REPLY</actions>, <providers></providers>, and a short honest fallback in character.\n' +
    'Example fallback text: Mi cyaan pull dat clean right now, try ask it different.';
}

async function sendFallbackReply(
  ctx: { chat?: { id?: number | string; type?: string }; message?: TelegramMessage },
  manager: {
    sendMessageInChunks?: (
      ctx: { chat?: { id?: number | string; type?: string } },
      content: { text: string },
      replyToMessageId?: number
    ) => Promise<unknown>;
    sendMessage?: (
      chatId: number | string,
      content: { text: string },
      replyToMessageId?: number
    ) => Promise<unknown>;
    bot?: {
      telegram?: {
        sendMessage?: (
          chatId: number | string,
          text: string,
          options?: Record<string, unknown>
        ) => Promise<unknown>;
      };
    };
  },
  rawText: string,
  websiteModeMatched: boolean,
  priceModeMatched: boolean,
  socialMode = false
) {
  const replyText = selectFallbackReply({
    rawText,
    websiteModeMatched,
    priceModeMatched,
    socialMode,
  });
  console.log(
    `${TELEGRAM_SEND_DEBUG_PREFIX} fallback_triggered=true text=${JSON.stringify(replyText)}`
  );

  if (manager.sendMessage && ctx.chat?.id != null) {
    const sent = await manager.sendMessage(ctx.chat.id, { text: replyText }, ctx.message?.message_id);
    const sentCount = Array.isArray(sent) ? sent.length : 0;
    console.log(
      `${TELEGRAM_SEND_DEBUG_PREFIX} fallback_sendMessage_completed=true sent_count=${sentCount}`
    );
    if (sentCount > 0) {
      return;
    }
  }

  if (manager.sendMessageInChunks) {
    const sent = await manager.sendMessageInChunks(ctx, { text: replyText }, ctx.message?.message_id);
    const sentCount = Array.isArray(sent) ? sent.length : 0;
    console.log(
      `${TELEGRAM_SEND_DEBUG_PREFIX} fallback_send_chunks_completed=true sent_count=${sentCount}`
    );
    if (sentCount > 0) {
      return;
    }
  }

  const telegramCtx = ctx as {
    reply?: (text: string) => Promise<unknown>;
  };

  if (telegramCtx.reply) {
    await telegramCtx.reply(replyText);
    console.log(`${TELEGRAM_SEND_DEBUG_PREFIX} fallback_ctx_reply_completed=true`);
    return;
  }

  if (ctx.chat?.id != null && manager.bot?.telegram?.sendMessage) {
    await manager.bot.telegram.sendMessage(ctx.chat.id, replyText, {
      reply_parameters: ctx.message?.message_id
        ? { message_id: ctx.message.message_id }
        : undefined,
    });
    console.log(`${TELEGRAM_SEND_DEBUG_PREFIX} fallback_raw_telegram_send_completed=true`);
  }
}

async function sendDirectReply(
  ctx: { chat?: { id?: number | string; type?: string }; message?: TelegramMessage },
  manager: {
    sendMessageInChunks?: (
      ctx: { chat?: { id?: number | string; type?: string } },
      content: { text: string },
      replyToMessageId?: number
    ) => Promise<unknown>;
    sendMessage?: (
      chatId: number | string,
      content: { text: string },
      replyToMessageId?: number
    ) => Promise<unknown>;
    bot?: {
      telegram?: {
        sendMessage?: (
          chatId: number | string,
          text: string,
          options?: Record<string, unknown>
        ) => Promise<unknown>;
      };
    };
  },
  replyText: string
) {
  if (manager.sendMessage && ctx.chat?.id != null) {
    const sent = await manager.sendMessage(ctx.chat.id, { text: replyText }, ctx.message?.message_id);
    const sentCount = Array.isArray(sent) ? sent.length : sent ? 1 : 0;
    console.log(
      `${TELEGRAM_SEND_DEBUG_PREFIX} direct_sendMessage_completed=true sent_count=${sentCount}`
    );
    if (sentCount > 0) {
      return;
    }
  }

  if (manager.sendMessageInChunks) {
    const sent = await manager.sendMessageInChunks(ctx, { text: replyText }, ctx.message?.message_id);
    const sentCount = Array.isArray(sent) ? sent.length : 0;
    console.log(
      `${TELEGRAM_SEND_DEBUG_PREFIX} direct_send_chunks_completed=true sent_count=${sentCount}`
    );
    if (sentCount > 0) {
      return;
    }
  }

  if (ctx.chat?.id != null && manager.bot?.telegram?.sendMessage) {
    await manager.bot.telegram.sendMessage(ctx.chat.id, replyText, {
      reply_parameters: ctx.message?.message_id
        ? { message_id: ctx.message.message_id }
        : undefined,
    });
    console.log(`${TELEGRAM_SEND_DEBUG_PREFIX} direct_raw_telegram_send_completed=true`);
  }
}

function applySocialMemoryHint(
  message: TelegramMessage | undefined,
  rawText: string,
  route: ConversationRoute
) {
  if (!message || !rawText || route !== 'social') {
    return;
  }

  const memory = rememberUser(message.from);

  if (!memory) {
    return;
  }

  const targetField = typeof message.text === 'string' ? 'text' : 'caption';
  const original = message[targetField];

  if (!original || original.includes(SOCIAL_MEMORY_PREFIX)) {
    return;
  }

  message[targetField] = `${original}\n\n${buildSocialMemoryHint(memory)}`;
}

function sanitizeActionsForRoute(actions: string[], route: ConversationRoute): string[] {
  const normalized = actions
    .map((action) => action.trim())
    .filter(Boolean)
    .filter((action) => VALID_ACTIONS.has(action.toUpperCase()));

  if (route === 'execution') {
    return ['REPLY'];
  }

  if (route !== 'social') {
    return ['REPLY'];
  }

  return normalized.length > 0 ? normalized : ['REPLY'];
}

function rememberUser(user: TelegramUser | undefined): SocialMemoryRecord | null {
  const userId = user?.id;

  if (userId == null) {
    return null;
  }

  const key = String(userId);
  const now = new Date().toISOString();
  const displayName = getDisplayName(user);
  const existing = socialMemory.get(key);

  const record: SocialMemoryRecord = existing
    ? {
        ...existing,
        username: user?.username ?? existing.username,
        displayName,
        lastSeenAt: now,
      }
    : {
        userId: key,
        username: user?.username,
        displayName,
        firstSeenAt: now,
        lastSeenAt: now,
      };

  socialMemory.set(key, record);

  return record;
}

function getDisplayName(user: TelegramUser | undefined): string {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();

  if (fullName) return fullName;
  if (user?.username?.trim()) return user.username.trim();

  return 'bredren';
}

function buildSocialMemoryHint(memory: SocialMemoryRecord): string {
  const seenBefore = memory.firstSeenAt !== memory.lastSeenAt;
  const knownName = memory.username ? `@${memory.username}` : memory.displayName;

  return [
    SOCIAL_MEMORY_PREFIX,
    'Use this only for social replies. Ignore it for ops or bot-status replies.',
    `user_id=${memory.userId}`,
    `display_name=${memory.displayName}`,
    `username=${memory.username ?? 'unknown'}`,
    `first_seen_at=${memory.firstSeenAt}`,
    `last_seen_at=${memory.lastSeenAt}`,
    `returning_user=${seenBefore ? 'yes' : 'no'}`,
    `social_greeting_hint=${
      seenBefore ? `${knownName} back on deck.` : `${knownName} first hail.`
    }`,
    memory.shortNote ? `short_note=${memory.shortNote}` : 'short_note=',
  ].join('\n');
}

async function createLocalDatabaseAdapter(agentId: string) {
  const { createDatabaseAdapter, DatabaseMigrationService, default: sqlPlugin } =
    await import('@elizaos/plugin-sql');

  const adapter = createDatabaseAdapter(
    {
      dataDir: process.env.PGLITE_DATA_DIR,
      postgresUrl: process.env.POSTGRES_URL,
    },
    agentId
  );

  await adapter.init();

  const migrationService = new DatabaseMigrationService();
  await migrationService.initializeWithDatabase(adapter.getDatabase());
  migrationService.registerSchema(sqlPlugin.name, sqlPlugin.schema);
  await migrationService.runAllPluginMigrations();

  return adapter;
}

function configureModelEnv() {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const preferredModel = process.env.MODEL_NAME?.trim();

  if (openRouterKey) {
    process.env.OPENAI_API_KEY = openRouterKey;
    process.env.OPENAI_BASE_URL =
      process.env.OPENAI_BASE_URL?.trim() || 'https://openrouter.ai/api/v1';
    process.env.OPENAI_SMALL_MODEL =
      process.env.OPENAI_SMALL_MODEL?.trim() || preferredModel || 'openrouter/auto';
    process.env.OPENAI_LARGE_MODEL =
      process.env.OPENAI_LARGE_MODEL?.trim() || preferredModel || 'openrouter/auto';
    process.env.OPENAI_EMBEDDING_MODEL =
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'openai/text-embedding-3-small';
  }

  process.env.SECRET_SALT =
    process.env.SECRET_SALT?.trim() || 'blaq-ceaser-telegram-test-only';
  process.env.PGLITE_DATA_DIR =
    process.env.PGLITE_DATA_DIR?.trim() || '.eliza/.telegram-test-db';

  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error(
      'Set OPENROUTER_API_KEY for the Telegram test runner. It is mapped to the OpenAI-compatible plugin automatically.'
    );
  }
}

function getAllowedTestChatIds(): string[] {
  const raw = process.env.TELEGRAM_ALLOWED_TEST_CHAT_ID?.trim();

  if (!raw) {
    throw new Error(
      'Set TELEGRAM_ALLOWED_TEST_CHAT_ID to the private Telegram test chat ID before starting Blaq Ceaser in Telegram.'
    );
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function configureTelegramTestEnv(allowedChatIds: string[]) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken) {
    throw new Error('Set TELEGRAM_BOT_TOKEN before starting the Telegram test runner.');
  }

  // Map the local safety env to the Telegram plugin's actual runtime setting.
  process.env.TELEGRAM_ALLOWED_CHATS = JSON.stringify(allowedChatIds);
}

function createTelegramTestCharacter() {
  const shell = createBlaqCeaserAppShell();
  const allowedGroupIds = getAllowedTestChatIds();
  const allowDirectMessages =
    process.env.TELEGRAM_ALLOW_DIRECT_MESSAGES?.trim().toLowerCase() === 'true';

  return {
    ...shell.character,
    id: TELEGRAM_TEST_AGENT_ID,
    allowDirectMessages,
    plugins: [
      '@elizaos/plugin-bootstrap',
      '@elizaos/plugin-openai',
      '@elizaos/plugin-telegram',
      './plugin-blaq-readonly',
    ],
    settings: {
      ...((shell.character.settings as Record<string, unknown> | undefined) ?? {}),
      readOnly: true,
      executionAuthority: 'ops-bot',
      telegramTestOnly: true,
      telegramMentionOnlyInGroups: true,
      telegramRequiredMention: TELEGRAM_GROUP_MENTION,
      opsModeKeywords:
        'bot, signal, trade, status, guardrails, performance, market, bias, review, confirm, site, website, homepage, page, pages, link, links, url, docs, info, about, nerdie, ops, bots',
      TELEGRAM_ALLOWED_CHATS: JSON.stringify(allowedGroupIds),
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN?.trim(),
      allowedTelegramTestChats: allowedGroupIds,
      allowDirectMessages,
    },
  };
}

export async function runTelegramTest() {
  const shell = ensureReadonlyBoundary();
  const { ElizaOS } = await loadElizaRuntime();
  const allowedChatIds = getAllowedTestChatIds();

  // Telegram test safety boundary:
  // - private test chat only via explicit allowed chat IDs
  // - no execution plugins
  // - no wallet plugins
  // - no live Ops execution path
  configureModelEnv();
  configureTelegramTestEnv(allowedChatIds);
  const runtimePlugins = await loadRuntimePlugins();
  const telegramCharacter = createTelegramTestCharacter();
  const databaseAdapter = await createLocalDatabaseAdapter(TELEGRAM_TEST_AGENT_ID);

  const elizaOS = new ElizaOS();
  await elizaOS.addAgents(
    [
      {
        character: telegramCharacter,
        plugins: [...runtimePlugins, ...shell.plugins],
        databaseAdapter,
      },
    ],
    {
      autoStart: true,
    }
  );

  console.log(
    JSON.stringify(
      {
        mode: 'telegram-test',
        agent: shell.character.name,
        readOnly: true,
        executionAuthority: 'ops-bot',
        telegram: {
          enabled: true,
          allowDirectMessages:
            process.env.TELEGRAM_ALLOW_DIRECT_MESSAGES?.trim().toLowerCase() === 'true',
          allowedTestChatIds: allowedChatIds,
        },
        notes: [
          'Blaq Ceaser is running in Telegram test mode only.',
          'Only the explicitly allowed private test chat IDs are permitted.',
          `In group chats, Blaq Ceaser only responds when ${TELEGRAM_GROUP_MENTION} is present.`,
          `Non-social routing turns on when the message matches the live or local-knowledge routes.`,
          'Execution requests must still be refused and routed back to Ops.',
        ],
      },
      null,
      2
    )
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTelegramTest().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Unknown Telegram test runner failure.'
    );
    process.exitCode = 1;
  });
}
