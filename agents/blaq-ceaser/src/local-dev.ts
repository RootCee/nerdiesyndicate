import { createBlaqCeaserAppShell } from './runtime-shell';

const LOCAL_ENTITY_ID = '00000000-0000-4000-8000-000000000001';
const LOCAL_ROOM_ID = '00000000-0000-4000-8000-000000000002';
const LOCAL_AGENT_ID = '00000000-0000-4000-8000-000000000003';
const EXECUTION_BLOCKERS = ['wallet', 'trade', 'execute', 'confirm', 'telegram'];

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
  try {
    return await import('@elizaos/core');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        'Eliza runtime packages are not installed yet.',
        'Run `npm install` at the workspace root to install the declared Eliza dependencies.',
        `Underlying error: ${message}`,
      ].join(' ')
    );
  }
}

async function loadRuntimePlugins() {
  const [{ default: bootstrapPlugin }, { default: openaiPlugin }] = await Promise.all([
    import('@elizaos/plugin-bootstrap'),
    import('@elizaos/plugin-openai'),
  ]);

  return [bootstrapPlugin, openaiPlugin];
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

function configureLocalModelEnv() {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const preferredModel = process.env.MODEL_NAME?.trim();

  // For local persona testing we use the OpenAI-compatible OpenRouter endpoint.
  // This keeps the runner minimal without adding another model plugin.
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
    process.env.SECRET_SALT?.trim() || 'blaq-ceaser-local-dev-only';
  process.env.PGLITE_DATA_DIR =
    process.env.PGLITE_DATA_DIR?.trim() || `.eliza/.local-dev-${Date.now()}`;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error(
      [
        'Set OPENROUTER_API_KEY for the local-only Eliza runtime test.',
        'The runner maps it to OPENAI_API_KEY and OPENAI_BASE_URL automatically.',
        'Telegram is still intentionally disabled.',
        'Execution remains off-limits to Blaq Ceaser.',
      ].join(' ')
    );
  }
}

function createLocalTestCharacter() {
  const shell = createBlaqCeaserAppShell();

  return {
    ...shell.character,
    id: LOCAL_AGENT_ID,
    // Keep the local test path minimal:
    // - retain the OpenAI-compatible model plugin name for OpenRouter
    // - keep bootstrap only for basic reply/action plumbing in local chat tests
    // - keep the custom read-only plugin only
    plugins: ['@elizaos/plugin-bootstrap', '@elizaos/plugin-openai', './plugin-blaq-readonly'],
  };
}

function getLocalPrompt(): string {
  const cliPrompt = process.argv.slice(2).join(' ').trim();
  if (cliPrompt) return cliPrompt;

  const envPrompt = process.env.LOCAL_TEST_PROMPT?.trim();
  if (envPrompt) return envPrompt;

  return 'Explain the latest bot status and guardrails without executing anything.';
}

export async function runLocalPrompt(prompt: string) {
  const shell = ensureReadonlyBoundary();
  const { ElizaOS } = await loadElizaRuntime();
  const localCharacter = createLocalTestCharacter();

  // Local-only runtime safety:
  // - load only bootstrap, the OpenAI-compatible model plugin, and our local read-only plugin
  // - pre-register a minimal local database adapter instead of loading the full SQL plugin lifecycle
  // - do not add wallet, trading, execution, or Telegram plugins here
  // - keep Ops as the only execution authority
  configureLocalModelEnv();
  const runtimePlugins = await loadRuntimePlugins();
  const databaseAdapter = await createLocalDatabaseAdapter(LOCAL_AGENT_ID);

  const elizaOS = new ElizaOS();
  const agentIds = await elizaOS.addAgents([
    {
      character: localCharacter,
      plugins: [...runtimePlugins, ...shell.plugins],
      databaseAdapter,
    },
  ], {
    autoStart: true,
  });

  const response = await elizaOS.handleMessage(agentIds[0], {
    entityId: LOCAL_ENTITY_ID,
    roomId: LOCAL_ROOM_ID,
    content: {
      text: prompt,
      source: 'local-dev',
    },
  });

  const responseText =
    (response.processing as { text?: string; responseContent?: { text?: string } } | undefined)
      ?.text ??
    (response.processing as { responseContent?: { text?: string } } | undefined)
      ?.responseContent?.text ??
    null;

  await elizaOS.stopAgents(agentIds);

  return {
    shell,
    prompt,
    responseText,
  };
}

export async function runLocalDevTest() {
  const prompt = getLocalPrompt();
  const { shell, responseText } = await runLocalPrompt(prompt);

  console.log(
    JSON.stringify(
      {
        mode: 'local-eliza-dev-test',
        agent: shell.character.name,
        readOnly: shell.config.readOnly,
        executionAuthority: shell.config.executionAuthority,
        prompt,
        response: responseText,
        notes: [
          'Telegram is intentionally not connected in local dev.',
          'This path is for local chat/runtime testing only.',
          'Execution requests must still route back to Ops.',
        ],
      },
      null,
      2
    )
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLocalDevTest().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Unknown local runtime failure.'
    );
    process.exitCode = 1;
  });
}
