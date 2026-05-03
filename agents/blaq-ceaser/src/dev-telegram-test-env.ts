import { loadBlaqCeaserEnv } from './load-blaq-env.js';
import { runTelegramTest } from './telegram-test.js';

loadBlaqCeaserEnv();

runTelegramTest().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown Telegram test runner failure.');
  process.exitCode = 1;
});
