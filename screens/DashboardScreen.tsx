import { DashboardFilterBar } from '../components/DashboardFilterBar';
import { FichaTecnicaModal } from '../components/FichaTecnicaModal';
import { FinalizadoOpCard } from '../components/FinalizadoOpCard';
import { FinalizarOpModal } from '../components/FinalizarOpModal';
import { OpCard } from '../components/OpCard';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useTheme } from '../contexts/ThemeContext';
import { enrichOpsComPendenteCorreto } from '../lib/enrichOpsPendente';
import { displayElapsedSeconds } from '../lib/displayOpTimer';
import { attachAdicionaisPedido } from '../lib/loadAdicionaisPedido';
import { loadFinalizadosFaccionista } from '../lib/loadFinalizados';
import {
  collectEmpresas,
  defaultOpFilters,
  filterAndSortFinalizados,
  filterAndSortOps,
  hasActiveFilters,
  mostrarOpsFinalizados,
  mostrarOpsPendentes,
  type OpFilters,
} from '../lib/opFilters';
import type {
  DashboardOk,
  DashboardResponse,
  OpFinalizadoRow,
  OpRow,
  TimerAtualizarOk,
  TimerAtualizarResponse,
} from '../types/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SessionInfo } from '../types/session';

type Props = {
  session: SessionInfo;
  onExit?: () => void;
  /** Dentro de MainFaccionistaApp — sem barra superior própria */
  embedded?: boolean;
};

function patchOpAfterTimerRpc(ops: OpRow[], opId: string, t: TimerAtualizarOk): OpRow[] {
  return ops.map((o) =>
    o.op_id === opId
      ? {
          ...o,
          timer_ativo: t.timer_ativo,
          timer_inicio: t.timer_inicio ?? null,
          tempo_acumulado_segundos: t.tempo_acumulado_segundos,
        }
      : o,
  );
}

export function DashboardScreen({ session, onExit, embedded = false }: Props) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [displayEmail, setDisplayEmail] = useState(session.email);
  const [ops, setOps] = useState<OpRow[]>(session.initialOps);
  const [finalizados, setFinalizados] = useState<OpFinalizadoRow[]>([]);
  const [filters, setFilters] = useState<OpFilters>(defaultOpFilters);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [finishOp, setFinishOp] = useState<OpRow | null>(null);
  const [fichaTarget, setFichaTarget] = useState<{ produtoId: string; produtoNome: string } | null>(
    null,
  );

  const fetchOps = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase.rpc('app_faccionista_dashboard');
    if (error) {
      setErr(error.message);
      return;
    }
    const payload = data as unknown as DashboardResponse;
    if (!payload || typeof payload !== 'object') {
      setErr('Erro ao carregar OPs.');
      return;
    }
    if (!payload.ok) {
      setErr(payload.error);
      return;
    }
    const ok = payload as DashboardOk;
    let fin = Array.isArray(ok.finalizados) ? ok.finalizados : [];
    if (fin.length === 0) {
      const alt = await loadFinalizadosFaccionista();
      if (alt.finalizados.length > 0) {
        fin = alt.finalizados;
      } else if (alt.error && !alt.error.toLowerCase().includes('could not find')) {
        setErr(alt.error);
      }
    }
    const opsBrutas = Array.isArray(ok.ops) ? ok.ops : [];
    const [opsComAdic, finComAdic] = await Promise.all([
      attachAdicionaisPedido(opsBrutas),
      attachAdicionaisPedido(fin),
    ]);
    setFinalizados(finComAdic);
    setOps(enrichOpsComPendenteCorreto(opsComAdic, finComAdic));
  }, []);

  useEffect(() => {
    void fetchOps();
  }, [fetchOps]);

  useEffect(() => {
    setDisplayEmail(session.email);
    if (session.email) return;
    void supabase.auth.getUser().then(({ data }) => {
      const em = data.user?.email?.trim();
      if (em) setDisplayEmail(em);
    });
  }, [session.email]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const empresas = useMemo(() => collectEmpresas(ops, finalizados), [ops, finalizados]);
  const filtersActive = hasActiveFilters(filters);
  const showPendentes = mostrarOpsPendentes(filters.listaOp);
  const showFinalizados = mostrarOpsFinalizados(filters.listaOp);

  const activeOps = useMemo(() => filterAndSortOps(ops, filters), [ops, filters]);
  const finalizadosFiltrados = useMemo(
    () => filterAndSortFinalizados(finalizados, filters),
    [finalizados, filters],
  );

  function elapsedMsFromOp(op: OpRow): number {
    return displayElapsedSeconds(op) * 1000;
  }

  function isOpTimerRunning(op: OpRow): boolean {
    return Boolean(op.timer_ativo);
  }

  async function persistTimerToServer(
    op: OpRow,
    next: { timer_ativo: boolean; timer_inicio: string | null; tempo_acumulado_segundos: number },
  ): Promise<boolean> {
    const sec = Math.max(0, Math.min(2147483647, Math.floor(next.tempo_acumulado_segundos)));
    const { data, error } = await supabase.rpc('app_producao_op_timer_atualizar', {
      p_op_id: op.op_id,
      p_tempo_acumulado_segundos: sec,
      p_timer_ativo: next.timer_ativo,
      p_timer_inicio: next.timer_inicio ?? null,
    });
    if (error) {
      setErr(error.message);
      return false;
    }
    const payload = data as unknown as TimerAtualizarResponse;
    if (!payload || typeof payload !== 'object' || !('ok' in payload) || !payload.ok) {
      const msg =
        payload && typeof payload === 'object' && 'ok' in payload && payload.ok === false && 'error' in payload
          ? String((payload as { error: string }).error)
          : 'Erro ao salvar cronômetro.';
      setErr(msg);
      return false;
    }
    const ok = payload as TimerAtualizarOk;
    setOps((prev) => patchOpAfterTimerRpc(prev, op.op_id, ok));
    return true;
  }

  async function toggleTimer(opId: string) {
    setErr(null);
    const op = ops.find((o) => o.op_id === opId);
    if (!op) return;
    if (op.timer_ativo) {
      const sec = displayElapsedSeconds(op);
      await persistTimerToServer(op, {
        timer_ativo: false,
        timer_inicio: null,
        tempo_acumulado_segundos: sec,
      });
    } else {
      const base = Math.floor(Number(op.tempo_acumulado_segundos ?? 0));
      await persistTimerToServer(op, {
        timer_ativo: true,
        timer_inicio: null,
        tempo_acumulado_segundos: base,
      });
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchOps();
    setRefreshing(false);
  }

  const emptyPendenteMsg =
    ops.length === 0
      ? 'Nenhum item pendente.'
      : filtersActive
        ? 'Nenhuma OP corresponde à busca.'
        : 'Nenhum item pendente.';

  const emptyFinMsg =
    finalizados.length === 0
      ? 'Nenhum item finalizado ainda.'
      : filtersActive
        ? 'Nenhuma OP finalizada corresponde à busca.'
        : 'Nenhum item finalizado ainda.';

  const body = (
    <>
      {!embedded ? (
        <View style={[styles.topBar, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.userEmail, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
            {displayEmail || '—'}
            {session.vinculosCount && session.vinculosCount > 1
              ? ` · ${session.vinculosCount} vínculos`
              : ''}
          </Text>
          <ThemeToggleButton theme={theme} isDark={isDark} onToggle={toggleTheme} />
          {onExit ? (
            <Pressable onPress={onExit} style={styles.sairBtn}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Sair</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <DashboardFilterBar
        theme={theme}
        empresas={empresas}
        filters={filters}
        onChange={setFilters}
      />

      {err ? (
        <Text style={[styles.bannerErr, { color: theme.error, backgroundColor: theme.surface }]}>
          {err}
        </Text>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {filtersActive ? (
          <Text style={[styles.filterHint, { color: theme.primary }]}>
            Filtro ativo
            {showPendentes ? ` · ${activeOps.length} pendente(s)` : ''}
            {showFinalizados ? ` · ${finalizadosFiltrados.length} finalizada(s)` : ''}
          </Text>
        ) : null}

        {showPendentes ? (
          <>
            <Text style={[styles.section, { color: theme.textSecondary }]}>Em produção (pendente)</Text>
            {activeOps.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textMuted }]}>{emptyPendenteMsg}</Text>
            ) : (
              activeOps.map((op) => (
                <OpCard
                  key={op.op_id}
                  theme={theme}
                  op={op}
                  elapsedMs={elapsedMsFromOp(op)}
                  running={isOpTimerRunning(op)}
                  onToggleTimer={() => toggleTimer(op.op_id)}
                  onRequestFinish={() => setFinishOp(op)}
                  onOpenFicha={(pid, nome) => setFichaTarget({ produtoId: pid, produtoNome: nome })}
                />
              ))
            )}
          </>
        ) : null}

        {showFinalizados ? (
          <>
            <Text
              style={[
                styles.section,
                { color: theme.textSecondary, marginTop: showPendentes ? 24 : 0 },
              ]}
            >
              Finalizado (por você)
            </Text>
            {finalizadosFiltrados.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textMuted }]}>{emptyFinMsg}</Text>
            ) : (
              finalizadosFiltrados.map((op) => (
                <FinalizadoOpCard key={op.op_id} theme={theme} op={op} />
              ))
            )}
          </>
        ) : null}
      </ScrollView>

      <FinalizarOpModal
        theme={theme}
        visible={finishOp !== null}
        op={finishOp}
        onClose={() => setFinishOp(null)}
        onSuccess={fetchOps}
      />

      <FichaTecnicaModal
        theme={theme}
        visible={fichaTarget !== null}
        produtoId={fichaTarget?.produtoId ?? null}
        produtoNome={fichaTarget?.produtoNome ?? ''}
        onClose={() => setFichaTarget(null)}
      />
    </>
  );

  if (embedded) {
    return <View style={[styles.safe, { backgroundColor: theme.background }]}>{body}</View>;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  userEmail: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '600',
  },
  sairBtn: { paddingVertical: 4, paddingHorizontal: 4, flexShrink: 0 },
  bannerErr: { padding: 12, fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 32 },
  filterHint: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  section: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  empty: { fontSize: 14, marginBottom: 8 },
});
