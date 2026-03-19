const OFFICIAL_SITE_URL = 'https://nerdieblaq.xyz/';
const ALLOWED_SITE_HOSTNAMES = new Set(['nerdieblaq.xyz', 'www.nerdieblaq.xyz']);
const WEBSITE_FETCH_TIMEOUT_MS = 8000;

export type WebsiteLink = {
  label: string;
  url: string;
};

export type WebsiteSnapshot = {
  url: string;
  title: string;
  description: string | null;
  homepageSummary: string;
  visibleLinks: WebsiteLink[];
  fetchedAt: string;
};

function assertAllowedSiteUrl(value: string) {
  const parsed = new URL(value);

  if (!ALLOWED_SITE_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
    throw new Error('Website fetch is restricted to the official Nerdie Blaq domain.');
  }

  return parsed;
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeForXmlPrompt(value: string) {
  return value.replace(/[<>]/g, ' ');
}

function extractMatch(source: string, pattern: RegExp) {
  const match = source.match(pattern);
  return match?.[1] ? collapseWhitespace(sanitizeForXmlPrompt(decodeHtml(match[1]))) : null;
}

function stripHtml(html: string) {
  return collapseWhitespace(
    sanitizeForXmlPrompt(
      decodeHtml(
      html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/(p|div|section|article|li|h[1-6]|br)>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
      )
    )
  );
}

function summarizeReadableText(value: string) {
  const compact = collapseWhitespace(value);

  if (!compact) {
    return 'homepage text unavailable';
  }

  const clipped = compact.slice(0, 500);
  const sentenceBreak = clipped.search(/[.!?](\s|$)/);

  if (sentenceBreak > 40) {
    return clipped.slice(0, sentenceBreak + 1).trim();
  }

  return clipped.trim();
}

function extractSameDomainLinks(html: string, baseUrl: string) {
  const links: WebsiteLink[] = [];
  const seen = new Set<string>();
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const href = match[1]?.trim();
    const rawLabel = stripHtml(match[2] ?? '');

    if (!href || !rawLabel) continue;

    try {
      const resolved = new URL(href, baseUrl);

      if (!ALLOWED_SITE_HOSTNAMES.has(resolved.hostname.toLowerCase())) {
        continue;
      }

      const normalized = resolved.toString();

      if (seen.has(normalized)) continue;

      seen.add(normalized);
      links.push({
        label: rawLabel,
        url: normalized,
      });
    } catch {
      continue;
    }
  }

  return links.slice(0, 8);
}

export async function fetchOfficialSiteSnapshot(): Promise<WebsiteSnapshot> {
  const parsedUrl = assertAllowedSiteUrl(OFFICIAL_SITE_URL);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBSITE_FETCH_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Official website fetch timed out after ${WEBSITE_FETCH_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Official website fetch failed with status ${response.status}.`);
  }

  const html = await response.text();
  const title =
    extractMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? 'Nerdie Blaq official site';
  const description = extractMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  );
  const readableText = stripHtml(html);
  const homepageSummary = summarizeReadableText(readableText);
  const visibleLinks = extractSameDomainLinks(html, parsedUrl.toString());

  return {
    url: parsedUrl.toString(),
    title,
    description,
    homepageSummary,
    visibleLinks,
    fetchedAt: new Date().toISOString(),
  };
}
