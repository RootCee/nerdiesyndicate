import { runLocalPrompt } from './local-dev.js';

type E2ECase = {
  prompt: string;
  expectsNonEmpty: boolean;
  expectsXml: boolean;
};

const CASES: E2ECase[] = [
  {
    prompt: 'who is RootCee',
    expectsNonEmpty: true,
    expectsXml: true,
  },
  {
    prompt: 'what is Nerdie Blaq',
    expectsNonEmpty: true,
    expectsXml: true,
  },
  {
    prompt: "what's BTC price",
    expectsNonEmpty: true,
    expectsXml: true,
  },
  {
    prompt: "what's on the site",
    expectsNonEmpty: true,
    expectsXml: true,
  },
  {
    prompt: 'sell my BTC now',
    expectsNonEmpty: true,
    expectsXml: true,
  },
];

function hasSingleXmlResponseBlock(text: string) {
  const trimmed = text.trim();

  if (!trimmed.startsWith('<response>') || !trimmed.endsWith('</response>')) {
    return false;
  }

  const responseMatches = trimmed.match(/<response>[\s\S]*<\/response>/g) ?? [];

  if (responseMatches.length !== 1) {
    return false;
  }

  return ['<thought>', '<actions>', '<providers>', '<text>'].every((tag) =>
    trimmed.includes(tag)
  );
}

async function runLocalE2ERegression() {
  const failures: string[] = [];
  const results: Array<{ prompt: string; response: string | null }> = [];

  for (const testCase of CASES) {
    const { responseText } = await runLocalPrompt(testCase.prompt);
    const nonEmpty = Boolean(responseText && responseText.trim());
    const xmlOk = responseText ? hasSingleXmlResponseBlock(responseText) : false;

    results.push({
      prompt: testCase.prompt,
      response: responseText,
    });

    if ((testCase.expectsNonEmpty && !nonEmpty) || (testCase.expectsXml && !xmlOk)) {
      failures.push(
        [
          `prompt=${JSON.stringify(testCase.prompt)}`,
          `non_empty=${nonEmpty}`,
          `xml_ok=${xmlOk}`,
          `response=${JSON.stringify(responseText)}`,
        ].join(' | ')
      );
    }
  }

  if (failures.length > 0) {
    console.error('Local E2E regression failed.');
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
        suite: 'blaq-ceaser-local-e2e',
        cases: CASES.length,
        prompts: results.map((result) => result.prompt),
      },
      null,
      2
    )
  );
}

runLocalE2ERegression().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown local e2e regression failure.');
  process.exitCode = 1;
});
