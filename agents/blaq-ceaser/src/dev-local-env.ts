import { loadBlaqCeaserEnv } from './load-blaq-env.js';
import { runLocalDevTest } from './local-dev.js';

loadBlaqCeaserEnv();

runLocalDevTest().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown local runtime failure.');
  process.exitCode = 1;
});
