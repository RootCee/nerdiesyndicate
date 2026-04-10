import type { NerdieCityRole, StarterToolDefinition } from "./types";

export const DEFAULT_STARTER_TOOL: StarterToolDefinition = {
  id: "intel-ping",
  family: "intel",
  scalingStats: ["hack", "luck"],
};

export const STARTER_TOOL_BY_ROLE: Record<NerdieCityRole, StarterToolDefinition> = {
  hacker: {
    id: "signal-jammer",
    family: "hacking",
    scalingStats: ["hack"],
  },
  trader: {
    id: "market-scanner",
    family: "business",
    scalingStats: ["influence", "luck"],
  },
  data_broker: {
    id: "intel-ping",
    family: "intel",
    scalingStats: ["hack", "luck"],
  },
  code_warrior: {
    id: "shield-pulse",
    family: "combat",
    scalingStats: ["defense"],
  },
};

export function getStarterToolForRole(role: string | null | undefined): StarterToolDefinition {
  return STARTER_TOOL_BY_ROLE[role as NerdieCityRole] ?? DEFAULT_STARTER_TOOL;
}
