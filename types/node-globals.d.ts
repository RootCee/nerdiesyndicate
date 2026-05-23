declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  cwd(): string;
  exitCode?: number;
};
