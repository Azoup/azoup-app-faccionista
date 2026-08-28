import {
  STATUS_FACCIONISTA,
  labelStatusFaccionista,
  normalizeStatusFaccionista,
} from '../constants/statusFaccionista';
import { formatDataLabel } from '../lib/formatData';
import { formatProdutoComSku } from '../lib/formatProduto';
import { parseQuantidade, quantidadePendente } from '../lib/opQuantidades';
import type { Theme } from '../constants/theme';
import type { OpRow } from '../types/api';
import { OpAdicionaisBlock } from './OpAdicionaisBlock';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatEntregaLabel(isoOrText: string): string {
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

function formatQty(q: number | string): string {
  const n = typeof q === 'number' ? q : parseFloat(String(q).replace(',', '.'));
  if (Number.isNaN(n)) return String(q);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n);
}

type Props = {
  theme: Theme;
  op: OpRow;
  elapsedMs: number;
  running: boolean;
  onToggleTimer: () => void;
  onRequestFinish: () => void;
  onOpenPausa?: () => void;
  onOpenFicha?: (produtoId: string, produtoNome: string, opId: string) => void;
};

export function OpCard({
  theme,
  op,
  elapsedMs,
  running,
  onToggleTimer,
  onRequestFinish,
  onOpenPausa,
  onOpenFicha,
}: Props) {
  const itens = Array.isArray(op.itens) ? op.itens : [];
  const produtoId = op.produto_id ?? null;
  const canFicha = Boolean(produtoId) && typeof onOpenFicha === 'function';
  const statusFacc = normalizeStatusFaccionista(op.status_faccionista);
  const erpStatus = String(op.status ?? '')
    .trim()
    .toUpperCase();
  const showErpStatus = erpStatus.length > 0 && erpStatus !== 'EM_PRODUCAO';
  const showStatusFacc = statusFacc !== STATUS_FACCIONISTA.EM_PRODUCAO;
  const previsaoFinalizacao = formatDataLabel(op.data_previsao_finalizacao);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.numero, { color: theme.primary }]}>OP {op.numero_op}</Text>
        {showErpStatus ? (
          <Text style={[styles.status, { color: theme.textMuted }]}>{op.status}</Text>
        ) : null}
      </View>
      {showStatusFacc ? (
        <Text style={[styles.statusFacc, { color: theme.primary }]}>
          {labelStatusFaccionista(statusFacc)}
        </Text>
      ) : null}
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {formatProdutoComSku(op.produto_nome, op.produto_sku)}
      </Text>
      {op.empresa_nome ? (
        <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
          {op.empresa_nome}
        </Text>
      ) : null}
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Data de envio: {formatEntregaLabel(op.data_entrega)}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Previsão de finalização: {previsaoFinalizacao ?? '—'}
      </Text>
      {op.fase_nome ? (
        <Text style={[styles.fase, { color: theme.textMuted }]} numberOfLines={1}>
          Fase: {op.fase_nome}
        </Text>
      ) : null}
      {op.observacao ? (
        <Text style={[styles.obs, { color: theme.textSecondary }]} numberOfLines={3}>
          {op.observacao}
        </Text>
      ) : null}

      <OpAdicionaisBlock theme={theme} adicionaisPedido={op.adicionais_pedido} />

      {itens.length > 0 ? (
        <View style={[styles.varBlock, { borderColor: theme.border }]}>
          <Text style={[styles.varTitle, { color: theme.primary }]}>Variações da OP</Text>
          {itens.map((it, idx) => (
            <View
              key={it.op_item_id ?? idx}
              style={[styles.varRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
            >
              <Text style={[styles.varMain, { color: theme.text }]}>
                <Text style={{ fontWeight: '800' }}>{formatQty(quantidadePendente(it))}</Text>
                <Text style={{ color: theme.textMuted, fontWeight: '400' }}> pend.</Text>
                {parseQuantidade(it.quantidade_finalizada) > 0 ? (
                  <Text style={{ color: theme.textMuted, fontWeight: '400' }}>
                    {' '}
                    ({formatQty(it.quantidade_finalizada ?? 0)} já fin. de {formatQty(it.quantidade)})
                  </Text>
                ) : null}
                {'  ·  '}
                <Text style={{ color: theme.textSecondary }}>Cor</Text> {it.cor?.trim() || '—'}
                {'  ·  '}
                <Text style={{ color: theme.textSecondary }}>Tam.</Text> {it.tamanho?.trim() || '—'}
              </Text>
              {it.parte?.trim() ? (
                <Text style={[styles.varParte, { color: theme.textMuted }]}>Parte: {it.parte}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {typeof onOpenPausa === 'function' ? (
        <Pressable
          onPress={onOpenPausa}
          style={({ pressed }) => [
            styles.btnPausa,
            { borderColor: theme.border, backgroundColor: theme.surfaceVariant },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Motivo pausa</Text>
        </Pressable>
      ) : null}

      {canFicha ? (
        <Pressable
          onPress={() => produtoId && onOpenFicha!(produtoId, op.produto_nome, op.op_id)}
          style={({ pressed }) => [
            styles.btnFicha,
            { borderColor: theme.primary, backgroundColor: theme.surfaceVariant },
            pressed && styles.pressed,
          ]}
        >
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Ficha técnica</Text>
        </Pressable>
      ) : (
        <Text style={[styles.fichaOff, { color: theme.textMuted }]}>
          Ficha técnica indisponível (produto sem id nesta OP).
        </Text>
      )}

      <View style={[styles.timerRow, { borderTopColor: theme.border }]}>
        <View style={styles.timerLeft}>
          <Pressable
            onPress={onToggleTimer}
            accessibilityLabel={running ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.btnPlay,
              { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={running ? 'pause' : 'play'}
              size={24}
              color={running ? theme.error : theme.success}
            />
          </Pressable>
          <Text style={[styles.timer, { color: theme.text }]}>{formatElapsed(elapsedMs)}</Text>
        </View>
        <Pressable
          onPress={onRequestFinish}
          style={({ pressed }) => [
            styles.btnDone,
            { borderColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Finalizar</Text>
        </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  numero: { fontSize: 16, fontWeight: '800' },
  status: { fontSize: 12, textTransform: 'uppercase' },
  statusFacc: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 13, marginBottom: 2 },
  fase: { fontSize: 12, marginTop: 4 },
  obs: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  varBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  varTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.4 },
  varRow: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  varMain: { fontSize: 14, lineHeight: 20 },
  varParte: { fontSize: 12, marginTop: 4 },
  btnPausa: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnFicha: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  fichaOff: { fontSize: 12, marginTop: 10 },
  timerRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  timer: { fontVariant: ['tabular-nums'], fontSize: 22, fontWeight: '700' },
  btnPlay: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDone: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  pressed: { opacity: 0.85 },
});
