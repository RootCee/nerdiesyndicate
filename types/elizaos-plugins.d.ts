declare module '@elizaos/plugin-bootstrap' {
  const plugin: unknown;
  export default plugin;
}

declare module '@elizaos/plugin-sql' {
  export class DatabaseMigrationService {
    initializeWithDatabase(db: unknown): Promise<void>;
    registerSchema(pluginName: string, schema: unknown): void;
    runAllPluginMigrations(options?: Record<string, unknown>): Promise<void>;
  }

  export function createDatabaseAdapter(
    config: {
      dataDir?: string;
      postgresUrl?: string;
    },
    agentId: string
  ): {
    init(): Promise<void>;
    getDatabase(): unknown;
  };

  const plugin: {
    name: string;
    schema: unknown;
  };

  export default plugin;
}

declare module '@elizaos/plugin-telegram' {
  export const MessageManager: {
    prototype: {
      handleMessage: (ctx: unknown) => Promise<void>;
    };
  };

  export const TelegramService: unknown;

  const plugin: unknown;
  export default plugin;
}
