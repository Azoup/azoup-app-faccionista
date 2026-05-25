import type { Theme } from '../constants/theme';
import type { OpFinalizadoRow } from '../types/api';
import { StyleSheet, Text, View } from 'react-native';

function formatEntrega(isoOrText: string): string {
  const t = Date.parse(isoOrText);
  if (Number.isNaN(t)) return isoOrText;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(t));
}

function fmtQty(q: number | string): string {
  const n = typeof q === 'number' ? q : parseFloat(String(q).replace(',', '.'));
  if (Number.isNaN(n)) return String(q);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n);
}

type Props = {
  theme: Theme;
  op: OpFinalizadoRow;
};

export function FinalizadoOpCard({ theme, op }: Props) {
  const itens = Array.isArray(op.itens) ? op.itens : [];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.numero, { color: theme.primary }]}>OP {op.numero_op}</Text>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {op.produto_nome}
      </Text>
      {op.empresa_nome ? (
        <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
          {op.empresa_nome}
        </Text>
      ) : null}
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        Última finalização: {formatEntrega(op.ultimo_finalizado_em)}
      </Text>

      <View style={[styles.varBlock, { borderColor: theme.border }]}>
        <Text style={[styles.varTitle, { color: theme.primary }]}>Itens finalizados</Text>
        {itens.map((it) => (
          <View
            key={it.finalizacao_item_id}
            style={[styles.varRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
          >
            <Text style={[styles.varMain, { color: theme.text }]}>
              <Text style={{ fontWeight: '800' }}>{fmtQty(it.quantidade_finalizada)}</Text>
              {'  ·  '}
              Cor {it.cor?.trim() || '—'} · Tam. {it.tamanho?.trim() || '—'}
            </Text>
            {it.parte?.trim() ? (
              <Text style={[styles.varParte, { color: theme.textMuted }]}>Parte: {it.parte}</Text>
            ) : null}
            <Text style={[styles.varData, { color: theme.textMuted }]}>
              {formatEntrega(it.finalizado_em)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  numero: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 13, marginBottom: 2 },
  varBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  varTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  varRow: { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 8 },
  varMain: { fontSize: 14, lineHeight: 20 },
  varParte: { fontSize: 12, marginTop: 4 },
  varData: { fontSize: 11, marginTop: 6 },
});
