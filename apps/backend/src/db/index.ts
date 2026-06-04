import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

function getSupabaseConfig(): { url: string; serviceKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment",
    );
  }
  return { url, serviceKey };
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const { url, serviceKey } = getSupabaseConfig();
    console.log("SUPABASE_URL:", url);

    supabaseClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

/** Lazy singleton — use for all database access over HTTPS */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type QueryResultRow = Record<string, unknown>;

/**
 * @deprecated Raw SQL is not available via the Supabase JS client.
 * Use `supabase.from("table")` instead.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  _text: string,
  _params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  throw new Error(
    "query() is deprecated. Use supabase.from('table') for database access.",
  );
}

export async function testConnection(): Promise<void> {
  const { error } = await supabase.from("users").select("id").limit(1);

  if (error) {
    throw error;
  }

  console.log("Database connected successfully");
}

export async function closePool(): Promise<void> {
  supabaseClient = null;
}
