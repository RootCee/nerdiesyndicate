import { selectFallbackReply } from './fallbackReply.js';
import { buildRouteInstruction, routeMessage } from './routeMessage.js';

type RouteCase = {
  prompt: string;
  expectedRoute:
    | 'social'
    | 'knowledge'
    | 'live_price'
    | 'live_website'
    | 'live_status'
    | 'execution';
  expectedProviders: string[];
};

const CASES: RouteCase[] = [
  {
    prompt: 'who is RootCee',
    expectedRoute: 'knowledge',
    expectedProviders: ['BLAQ_KNOWLEDGE_CONTEXT'],
  },
  {
    prompt: '@BlaqCeaser_bot who is RootCee',
    expectedRoute: 'knowledge',
    expectedProviders: ['BLAQ_KNOWLEDGE_CONTEXT'],
  },
  {
    prompt: 'what is Nerdie Blaq',
    expectedRoute: 'knowledge',
    expectedProviders: ['BLAQ_KNOWLEDGE_CONTEXT'],
  },
  {
    prompt: '@BlaqCeaser_bot what is Nerdie Blaq',
    expectedRoute: 'knowledge',
    expectedProviders: ['BLAQ_KNOWLEDGE_CONTEXT'],
  },
  {
    prompt: "what's BTC price",
    expectedRoute: 'live_price',
    expectedProviders: ['BLAQ_PRICE_CONTEXT'],
  },
  {
    prompt: '@BlaqCeaser_bot what is the price of btc',
    expectedRoute: 'live_price',
    expectedProviders: ['BLAQ_PRICE_CONTEXT'],
  },
  {
    prompt: "what's the latest ETH signal",
    expectedRoute: 'live_price',
    expectedProviders: ['BLAQ_PRICE_CONTEXT'],
  },
  {
    prompt: "what's on the site",
    expectedRoute: 'live_website',
    expectedProviders: ['BLAQ_WEBSITE_CONTEXT'],
  },
  {
    prompt: "@BlaqCeaser_bot what's on the site",
    expectedRoute: 'live_website',
    expectedProviders: ['BLAQ_WEBSITE_CONTEXT'],
  },
  {
    prompt: "what's the bot seeing right now",
    expectedRoute: 'live_status',
    expectedProviders: [
      'BLAQ_STATUS_CONTEXT',
      'BLAQ_SIGNAL_CONTEXT',
      'BLAQ_GUARDRAILS_CONTEXT',
    ],
  },
  {
    prompt: "@BlaqCeaser_bot what's the bot seeing right now",
    expectedRoute: 'live_status',
    expectedProviders: [
      'BLAQ_STATUS_CONTEXT',
      'BLAQ_SIGNAL_CONTEXT',
      'BLAQ_GUARDRAILS_CONTEXT',
    ],
  },
  {
    prompt: 'sell my BTC now',
    expectedRoute: 'execution',
    expectedProviders: [],
  },
  {
    prompt: 'wagwan mi gee',
    expectedRoute: 'social',
    expectedProviders: [],
  },
];

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function runRouterRegression() {
  const failures: string[] = [];

  for (const testCase of CASES) {
    const result = routeMessage(testCase.prompt);
    const routeMatches = result.route === testCase.expectedRoute;
    const providersMatch = arraysEqual(result.providers, testCase.expectedProviders);
    const instruction = buildRouteInstruction(result);
    const expectedInstructionProviders = testCase.expectedProviders.join(',');
    const instructionMatches =
      testCase.expectedRoute === 'social'
        ? instruction === null
        : Boolean(
            instruction &&
              instruction.includes(`[ROUTE_INSTRUCTION]`) &&
              instruction.includes(`route=${testCase.expectedRoute.toUpperCase()}`) &&
              instruction.includes(`providers=${expectedInstructionProviders}`)
          );

    if (!routeMatches || !providersMatch || !instructionMatches) {
      failures.push(
        [
          `prompt=${JSON.stringify(testCase.prompt)}`,
          `expected_route=${testCase.expectedRoute}`,
          `actual_route=${result.route}`,
          `expected_providers=${JSON.stringify(testCase.expectedProviders)}`,
          `actual_providers=${JSON.stringify(result.providers)}`,
          `instruction_ok=${instructionMatches}`,
        ].join(' | ')
      );
    }
  }

  const fallbackCases = [
    {
      label: 'website fallback',
      input: {
        rawText: "@BlaqCeaser_bot what's on the site",
        websiteModeMatched: true,
        priceModeMatched: false,
      },
      expected:
        "Mi couldn't read the site right now, bredren, but the official link is https://nerdieblaq.xyz.",
    },
    {
      label: 'price fallback',
      input: {
        rawText: '@BlaqCeaser_bot what is the price of btc',
        websiteModeMatched: false,
        priceModeMatched: true,
      },
      expected: 'Mi nah have a solid board read pon dat yet.',
    },
    {
      label: 'generic fallback',
      input: {
        rawText: '@BlaqCeaser_bot what is happening',
        websiteModeMatched: false,
        priceModeMatched: false,
      },
      expected: 'Mi cyaan pull dat clean right now, try ask it different.',
    },
    {
      label: 'empty fallback',
      input: {
        rawText: '   ',
        websiteModeMatched: false,
        priceModeMatched: false,
      },
      expected: 'Bomboclaat, mi nah get a clean read pon dat right now.',
    },
  ] as const;

  for (const fallbackCase of fallbackCases) {
    const actual = selectFallbackReply(fallbackCase.input);

    if (actual !== fallbackCase.expected) {
      failures.push(
        [
          `fallback_case=${fallbackCase.label}`,
          `expected=${JSON.stringify(fallbackCase.expected)}`,
          `actual=${JSON.stringify(actual)}`,
        ].join(' | ')
      );
    }
  }

  if (failures.length > 0) {
    console.error('Router regression failed.');
    for (const failure of failures) {
      console.error(failure);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        suite: 'blaq-ceaser-router-regression',
        cases: CASES.length,
      },
      null,
      2
    )
  );
}

runRouterRegression();
