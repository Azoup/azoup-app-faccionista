import { FichaTecnicaModal } from '../components/FichaTecnicaModal';
import { FinalizadoOpCard } from '../components/FinalizadoOpCard';
import { FinalizarOpModal } from '../components/FinalizarOpModal';
import { OpCard } from '../components/OpCard';
import { OpFiltersModal } from '../components/OpFiltersModal';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useTheme } from '../contexts/ThemeContext';
import { enrichOpsComPendenteCorreto } from '../lib/enrichOpsPendente';
import { displayElapsedSeconds } from '../lib/displayOpTimer';
import { loadFinalizadosFaccionista } from '../lib/loadFinalizados';
import {
  collectEmpresas,
  countActiveFilters,
  defaultOpFilters,
  filterAndSortFinalizados,
  filterAndSortOps,
  type OpFilters,
} from '../lib/opFilters';
import { supabase } from '../lib/supabase';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SessionInfo } from '../types/session';

type Props = {
  session: SessionInfo;
  onExit: () => void;
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

export function DashboardScreen({ session, onExit }: Props) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [ops, setOps] = useState<OpRow[]>(session.initialOps);
  const [finalizados, setFinalizados] = useState<OpFinalizadoRow[]>([]);
  const [filters, setFilters] = useState<OpFilters>(defaultOpFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    setFinalizados(fin);
    setOps(enrichOpsComPendenteCorreto(opsBrutas, fin));
  }, []);

  useEffect(() => {
    void fetchOps();
  }, [fetchOps]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const empresas = useMemo(() => collectEmpresas(ops, finalizados), [ops, finalizados]);
  const activeFiltersCount = countActiveFilters(filters);

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
      : activeFiltersCount > 0
        ? 'Nenhuma OP corresponde aos filtros.'
        : 'Nenhum item pendente.';

  const emptyFinMsg =
    finalizados.length === 0
      ? 'Nenhum item finalizado ainda.'
      : activeFiltersCount > 0
        ? 'Nenhuma OP finalizada corresponde aos filtros.'
        : 'Nenhum item finalizado ainda.';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <View style={styles.topBarSpacer} />
        <View style={styles.topActions}>
          <ThemeToggleButton theme={theme} isDark={isDark} onToggle={toggleTheme} />
          <Pressable onPress={() => setFiltersOpen(true)} style={styles.filtrosBtn}>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>Filtros</Text>
            {activeFiltersCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <Text style={[styles.badgeText, { color: theme.textOnPrimary }]}>{activeFiltersCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <Pressable onPress={onExit} style={styles.sairBtn}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Sair</Text>
        </Pressable>
      </View>

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
        {activeFiltersCount > 0 ? (
          <Text style={[styles.filterHint, { color: theme.primary }]}>
            Filtros ativos · {activeOps.length} pendente(s) · {finalizadosFiltrados.length} finalizada(s)
          </Text>
        ) : null}

        <Text style={[styles.section, { color: theme.textSecondary }]}>Em produção (pendente)</Text>
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Só o que ainda falta finalizar. Use Filtros para buscar OP, empresa ou data de entrega.
        </Text>
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

        <Text style={[styles.section, { color: theme.textSecondary, marginTop: 24 }]}>
          Finalizado (por você)
        </Text>
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Tudo que você já registrou — inclusive finalização parcial.
        </Text>
        {finalizadosFiltrados.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>{emptyFinMsg}</Text>
        ) : (
          finalizadosFiltrados.map((op) => <FinalizadoOpCard key={op.op_id} theme={theme} op={op} />)
        )}
      </ScrollView>

      <OpFiltersModal
        theme={theme}
        visible={filtersOpen}
        empresas={empresas}
        initial={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={setFilters}
      />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  topBarSpacer: { flex: 1 },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filtrosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 6,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  sairBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  bannerErr: { padding: 12, fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 32 },
  filterHint: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  section: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  hint: { fontSize: 12, marginBottom: 12, lineHeight: 18 },
  empty: { fontSize: 14, marginBottom: 8 },
});
