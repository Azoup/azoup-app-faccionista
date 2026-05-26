import { MainFaccionistaApp } from './screens/MainFaccionistaApp';
import { LoginScreen } from './screens/LoginScreen';
import type { SessionInfo } from './types/session';
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from './lib/supabase';
import type { DashboardOk, DashboardResponse } from './types/api';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

async function fetchDashboardSession(): Promise<
  { ok: true; session: SessionInfo } | { ok: false; error: string }
> {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      return { ok: false, error: userErr.message };
    }
    const email = userData.user?.email?.trim().toLowerCase() ?? '';
    if (!email) {
      return { ok: false, error: 'Sessão sem e-mail. Faça login novamente.' };
    }

    const { data, error } = await supabase.rpc('app_faccionista_dashboard');
    if (error) {
      return {
        ok: false,
        error: `Erro ao validar acesso: ${error.message}`,
      };
    }
    const payload = data as unknown as DashboardResponse;
    if (!payload || typeof payload !== 'object') {
      return {
        ok: false,
        error: 'Resposta inválida do servidor ao validar login.',
      };
    }
    if (!payload.ok) {
      const errMsg =
        'error' in payload && payload.error
          ? String(payload.error)
          : 'Usuário não autorizado. Verifique login_faccionista (auth_user_id e status ativo).';
      return { ok: false, error: errMsg };
    }
    const ok = payload as DashboardOk;
    if (!ok.faccionista?.id) {
      return { ok: false, error: 'Fornecedor não encontrado para este login.' };
    }
    return {
      ok: true,
      session: {
        faccionistaId: ok.faccionista.id,
        nome: ok.faccionista.nome ?? 'Faccionista',
        vinculosCount:
          typeof ok.faccionista.vinculos_count === 'number'
            ? ok.faccionista.vinculos_count
            : undefined,
        email,
        initialOps: Array.isArray(ok.ops) ? ok.ops : [],
      },
    };
  } catch (e) {
    const text = e instanceof Error ? e.message : 'Erro de conexão';
    return { ok: false, error: `Falha ao validar sessão: ${text}` };
  }
}

function AppRoot() {
  const { theme, isDark } = useTheme();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [booting, setBooting] = useState(true);

  type SyncOpts = { bootOverlay?: boolean };

  const syncSession = useCallback(async (opts?: SyncOpts): Promise<string | null> => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      return supabaseConfigMessage;
    }
    const useOverlay = opts?.bootOverlay !== false;
    if (useOverlay) setBooting(true);
    try {
      const { data: auth, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        setSession(null);
        return sessErr.message;
      }
      const s = auth.session;
      if (!s) {
        setSession(null);
        return null;
      }
      const r = await fetchDashboardSession();
      if (!r.ok) {
        await supabase.auth.signOut();
        setSession(null);
        return r.error;
      }
      setSession(r.session);
      return null;
    } catch (e) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      setSession(null);
      const text = e instanceof Error ? e.message : 'erro desconhecido';
      return `Falha ao validar sessão: ${text}`;
    } finally {
      if (useOverlay) setBooting(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setBooting(false);
      return;
    }

    let cancelled = false;

    void syncSession();

    const { data: subWrapper } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) return;
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        return;
      }
      if (event === 'SIGNED_OUT' || !s) {
        setSession(null);
        setBooting(false);
        return;
      }
      if (event === 'SIGNED_IN') {
        return;
      }
      if (event === 'USER_UPDATED') {
        void syncSession();
      }
    });

    return () => {
      cancelled = true;
      subWrapper.subscription.unsubscribe();
    };
  }, [syncSession]);

  async function exitApp() {
    await supabase.auth.signOut();
    setSession(null);
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {booting ? (
        <View style={[styles.boot, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : session ? (
        <MainFaccionistaApp session={session} onExit={exitApp} />
      ) : (
        <LoginScreen onSignedIn={() => syncSession({ bootOverlay: false })} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default function App() {
  return (
    <ThemeProvider>
      <AppRoot />
    </ThemeProvider>
  );
}
