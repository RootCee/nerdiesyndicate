declare module '@elizaos/core' {
  export interface AgentDefinition {
    character: Character;
    plugins?: unknown[];
    settings?: Record<string, unknown>;
    databaseAdapter?: unknown;
    init?: (runtime: unknown) => Promise<void> | void;
  }

  export interface HandleMessageInput {
    entityId: string;
    roomId: string;
    content: {
      text: string;
      source: string;
    };
  }

  export interface HandleMessageResult {
    processing?: {
      text?: string;
    };
    [key: string]: unknown;
  }

  export interface Character {
    name: string;
    username?: string;
    bio: string | string[];
    system?: string;
    topics?: string[];
    adjectives?: string[];
    messageExamples?: Array<Array<Record<string, unknown>>>;
    style?: Record<string, string[]>;
    plugins?: string[];
    settings?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface Plugin {
    name: string;
    description?: string;
    actions?: unknown[];
    providers?: unknown[];
    evaluators?: unknown[];
    services?: unknown[];
    [key: string]: unknown;
  }

  export class ElizaOS {
    constructor();
    addAgents(
      agents: AgentDefinition[],
      options?: Record<string, unknown>
    ): Promise<string[]>;
    startAgents(): Promise<void>;
    stopAgents(agentIds?: string[]): Promise<void>;
    handleMessage(
      agentId: string,
      message: HandleMessageInput,
      options?: Record<string, unknown>
    ): Promise<HandleMessageResult>;
    healthCheck(): Promise<unknown>;
  }
}
