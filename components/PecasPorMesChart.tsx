import type { Theme } from '../constants/theme';
import type { ResumoMesPecas } from '../types/api';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  theme: Theme;
  meses: ResumoMesPecas[];
};

function formatMesLabel(mes: string): string {
  const [y, m] = mes.split('-');
  if (!y || !m) return mes;
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] ?? m}/${y.slice(2)}`;
}

export function PecasPorMesChart({ theme, meses }: Props) {
  const rows = meses.length > 0 ? meses : [];
  const max = Math.max(...rows.map((r) => Number(r.pecas) || 0), 1);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Peças finalizadas — últimos meses</Text>
      {rows.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>Sem finalizações no período.</Text>
      ) : (
        rows.map((row) => {
          const pecas = Number(row.pecas) || 0;
          const pct = Math.max(4, Math.round((pecas / max) * 100));
          return (
            <View key={row.mes} style={styles.row}>
              <Text style={[styles.mes, { color: theme.textSecondary }]}>{formatMesLabel(row.mes)}</Text>
              <View style={[styles.track, { backgroundColor: theme.surfaceVariant }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${pct}%`, backgroundColor: theme.primary },
                  ]}
                />
              </View>
              <Text style={[styles.qty, { color: theme.text }]}>{pecas}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  empty: { fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  mes: {
    width: 52,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 4,
  },
  qty: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
