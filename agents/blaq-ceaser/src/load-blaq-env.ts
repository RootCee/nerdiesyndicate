import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY_ROOT_ENV_PATH = resolve(
  PACKAGE_DIR,
  '..',
  '..',
  '..',
  'agents',
  'blaq-ceaser',
  '.env.local'
);

type BlaqCeaserEnvLoadResult = {
  loadedEnvPath: string;
  tokenDefinedInFile: boolean;
  tokenDefinedBeforeLoad: boolean;
  tokenSource: 'file' | 'process';
};

function getCandidateEnvPaths() {
  const explicitEnvPath = process.env.BLAQ_CEASER_ENV_FILE?.trim();

  return [explicitEnvPath, resolve(PACKAGE_DIR, '.env.local'), LEGACY_ROOT_ENV_PATH].filter(
    (value): value is string => Boolean(value)
  );
}

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function fingerprintEnvValue(value: string | undefined) {
  const normalized = value ? normalizeEnvValue(value) : '';

  return {
    exists: normalized.length > 0,
    length: normalized.length,
    first8: normalized.length > 0 ? normalized.slice(0, 8) : '',
    last4: normalized.length > 0 ? normalized.slice(-4) : '',
  };
}

function isEnvDebugEnabled() {
  return process.env.BLAQ_CEASER_ENV_DEBUG?.trim().toLowerCase() === 'true';
}

function logEnvDebug(result: BlaqCeaserEnvLoadResult) {
  if (!isEnvDebugEnabled()) {
    return;
  }

  const currentToken = fingerprintEnvValue(process.env.TELEGRAM_BOT_TOKEN);

  console.log(
    JSON.stringify(
      {
        type: 'blaq-ceaser-env-debug',
        loadedEnvPath: result.loadedEnvPath,
        tokenDefinedBeforeLoad: result.tokenDefinedBeforeLoad,
        tokenDefinedInFile: result.tokenDefinedInFile,
        tokenSource: result.tokenSource,
        telegramBotToken: currentToken,
      },
      null,
      2
    )
  );
}

function readAndParseEnvFile(envPath: string) {
  const envFile = readFileSync(envPath, 'utf8');
  const parsed = parseEnv(envFile);

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, normalizeEnvValue(value ?? '')])
  );
}

export function loadBlaqCeaserEnv(): BlaqCeaserEnvLoadResult {
  const tokenDefinedBeforeLoad = Boolean(normalizeEnvValue(process.env.TELEGRAM_BOT_TOKEN ?? ''));

  for (const candidatePath of getCandidateEnvPaths()) {
    if (!existsSync(candidatePath)) {
      continue;
    }

    const parsed = readAndParseEnvFile(candidatePath);

    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value;
    }

    const result: BlaqCeaserEnvLoadResult = {
      loadedEnvPath: candidatePath,
      tokenDefinedInFile: typeof parsed.TELEGRAM_BOT_TOKEN === 'string' && parsed.TELEGRAM_BOT_TOKEN.length > 0,
      tokenDefinedBeforeLoad,
      tokenSource:
        typeof parsed.TELEGRAM_BOT_TOKEN === 'string' && parsed.TELEGRAM_BOT_TOKEN.length > 0
          ? 'file'
          : 'process',
    };

    logEnvDebug(result);
    return result;
  }

  const searchedPaths = getCandidateEnvPaths()
    .map((candidatePath) => `- ${candidatePath}`)
    .join('\n');

  throw new Error(
    [
      'Blaq Ceaser could not find a .env.local file.',
      'Checked these paths:',
      searchedPaths,
      'Create nerdiesyndicate/agents/blaq-ceaser/.env.local or keep using the legacy repo-root agents/blaq-ceaser/.env.local.',
    ].join('\n')
  );
}
