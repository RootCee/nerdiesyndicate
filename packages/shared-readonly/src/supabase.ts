type QueryValue = string | number | boolean;

const SUPABASE_URL =
  process.env.SHARED_READONLY_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SHARED_READONLY_SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY;

export function isReadonlySupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export async function fetchSupabaseRows<T>(
  table: string,
  query: Record<string, QueryValue> = {}
): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Read-only Supabase environment variables are missing.');
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load read-only table ${table}`);
  }

  return response.json() as Promise<T[]>;
}
