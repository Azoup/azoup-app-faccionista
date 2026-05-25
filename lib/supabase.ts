import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

const CONFIG_MSG =
  'Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY na Vercel (Settings → Environment Variables), marque Production, e faça Redeploy do projeto.';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(CONFIG_MSG);
  }
  if (!client) {
    client = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!.trim(),
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!.trim(),
      {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    );
  }
  return client;
}

/** Cliente Supabase (só use após `isSupabaseConfigured()` ou trate o erro). */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient();
    const value = Reflect.get(c, prop, c);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(c) : value;
  },
});

export const supabaseConfigMessage = CONFIG_MSG;
