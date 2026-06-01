import { supabase } from './supabase';

/** Limpa sessão local quando o refresh token expirou ou foi revogado no servidor. */
export function isInvalidRefreshError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('refresh token') ||
    m.includes('invalid refresh') ||
    m.includes('refresh_token_not_found')
  );
}

export async function clearLocalAuthSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
}
