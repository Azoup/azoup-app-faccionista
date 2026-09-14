import { PecasPorMesChart } from '../components/PecasPorMesChart';
import { StatCard } from '../components/StatCard';
import { useTheme } from '../contexts/ThemeContext';
import { formatMoneyBRL, formatQuantidade } from '../lib/formatMoney';
import { loadResumoFaccionista } from '../lib/loadResumoFaccionista';
import { loadValoresResumo } from '../lib/loadValoresResumo';
import type { ResumoFinanceiroOk } from '../types/api';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  faccionistaId?: string | null;
};

export function ResumoFaccionistaScreen({ faccionistaId }: Props) {
  const { theme } = useTheme();
  const [data, setData] = useState<ResumoFinanceiroOk | null>(null);
  const [valorProduzido, setValorProduzido] = useState(0);
  const [valorRecebido, setValorRecebido] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchResumo = useCallback(async () => {
    setErr(null);
    const [r, valores] = await Promise.all([
      loadResumoFaccionista(),
      loadValoresResumo(faccionistaId),
    ]);
    if (!r.ok) {
      setErr(r.error);
      setData(null);
      return;
    }
    setData(r.data);
    if (valores.ok) {
      setValorProduzido(valores.data.valorProduzido);
      setValorRecebido(valores.data.valorRecebido);
      return;
    }
    const produzido = Number(r.data.valor_produzido ?? 0) || 0;
    const recebido = Number(r.data.valor_recebido ?? 0) || 0;
    setValorProduzido(produzido);
    setValorRecebido(recebido);
  }, [faccionistaId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await fetchResumo();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchResumo]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchResumo();
    setRefreshing(false);
  }

  if (loading && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const meses = Array.isArray(data?.meses) ? data.meses : [];
  const valorAReceber = Math.max(0, Math.round((valorProduzido - valorRecebido) * 100) / 100);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      {err ? (
        <Text style={[styles.bannerErr, { color: theme.error, backgroundColor: theme.surface }]}>
          {err}
        </Text>
      ) : null}

      <View style={styles.cardsRow}>
        <StatCard
          theme={theme}
          label="Peças finalizadas"
          value={formatQuantidade(data?.total_pecas_finalizadas)}
          accent="success"
        />
        <StatCard
          theme={theme}
          label="Peças pendentes"
          value={formatQuantidade(data?.total_pecas_pendentes)}
          hint="Em produção (OP aberta)"
        />
      </View>

      <View style={styles.cardsRow}>
        <StatCard
          theme={theme}
          label="Valor produzido"
          value={formatMoneyBRL(valorProduzido)}
          hint="Peças finalizadas × mão de obra"
        />
        <StatCard
          theme={theme}
          label="Valor recebido"
          value={formatMoneyBRL(valorRecebido)}
          accent="success"
        />
      </View>

      <View style={styles.cardsRow}>
        <StatCard
          theme={theme}
          label="Valor a receber"
          value={formatMoneyBRL(valorAReceber)}
          hint={`${formatMoneyBRL(valorProduzido)} produzido − ${formatMoneyBRL(valorRecebido)} recebido`}
          accent="warning"
        />
      </View>

      <PecasPorMesChart theme={theme} meses={meses} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  bannerErr: { padding: 12, fontSize: 14, borderRadius: 8, marginBottom: 12 },
});
