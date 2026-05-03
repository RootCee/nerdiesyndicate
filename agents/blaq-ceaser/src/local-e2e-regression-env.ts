import { loadBlaqCeaserEnv } from './load-blaq-env.js';

loadBlaqCeaserEnv();

await import('./local-e2e-regression.js');
