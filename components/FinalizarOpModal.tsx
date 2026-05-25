import type { Theme } from '../constants/theme';
import {
  filtrarEntradaQuantidade,
  formatQuantidadeInput,
  formatQuantidadeLabel,
  itemTemPendente,
  parseQuantidade,
  quantidadeMaxInput,
  quantidadePendente,
  quantidadeTotalItem,
} from '../lib/opQuantidades';
import { loadItensPendentesOp } from '../lib/loadItensPendentes';
import { supabase } from '../lib/supabase';
import type { OpItemRow, OpRow } from '../types/api';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type FinalizarResponse =
  | { ok: true; status_faccionista: string; itens_registrados: number }
  | { ok: false; error: string };

type Props = {
  theme: Theme;
  visible: boolean;
  op: OpRow | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

function parseQtyInput(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

function fmtQty(q: number | string | undefined): string {
  return formatQuantidadeLabel(q);
}

function normalizeOpItemId(raw: OpItemRow): string {
  const v = raw.op_item_id;
  if (v == null) return '';
  return String(v).trim();
}

function itemRowKey(it: OpItemRow, idx: number): string {
  const id = normalizeOpItemId(it);
  return id || `row-${idx}`;
}

function normalizeItens(rows: OpItemRow[]): OpItemRowUi[] {
  return rows.map((r, idx) => {
    const normalized = { ...r, op_item_id: normalizeOpItemId(r) || undefined };
    return { ...normalized, _rowKey: itemRowKey(normalized, idx) };
  });
}

type OpItemRowUi = OpItemRow & { _rowKey?: string };

function initQtyMap(list: OpItemRowUi[]): Record<string, string> {
  const init: Record<string, string> = {};
  list.forEach((it, idx) => {
    const key = it._rowKey ?? itemRowKey(it, idx);
    init[key] = formatQuantidadeInput(quantidadeMaxInput(it));
  });
  return init;
}

export function FinalizarOpModal({ theme, visible, op, onClose, onSuccess }: Props) {
  const [itens, setItens] = useState<OpItemRowUi[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [qtyByItem, setQtyByItem] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !op) {
      setItens([]);
      setQtyByItem({});
      setErr(null);
      return;
    }

    let cancelled = false;
    const opAtual = op;

    async function load() {
      setLoadingItens(true);
      setErr(null);
      try {
        const { itens: list, warn } = await loadItensPendentesOp(
          opAtual.op_id,
          Array.isArray(opAtual.itens) ? opAtual.itens : [],
        );

        if (cancelled) return;

        const normalized = normalizeItens(list);

        if (!cancelled) {
          setItens(normalized);
          setQtyByItem(initQtyMap(normalized));
          if (normalized.length === 0) {
            setErr(warn ?? 'Nenhum item pendente nesta OP.');
          } else if (normalized.some((it) => !normalizeOpItemId(it))) {
            setErr(
              'Itens sem ID no servidor. Rode sql/08 e sql/01 no Supabase, puxe para atualizar a lista e tente de novo.',
            );
          } else {
            setErr(null);
          }
        }
      } finally {
        if (!cancelled) setLoadingItens(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, op?.op_id]);

  async function submit(finalizarTudo: boolean) {
    if (!op) return;
    setErr(null);
    setLoading(true);
    try {
      let p_itens: { op_item_id: string; quantidade: number }[] = [];
      if (!finalizarTudo) {
        for (let idx = 0; idx < itens.length; idx++) {
          const it = itens[idx];
          const key = it._rowKey ?? itemRowKey(it, idx);
          const opItemId = normalizeOpItemId(it);
          const maxQtd = quantidadeMaxInput(it);
          const q = parseQtyInput(qtyByItem[key] ?? '');
          if (q === null) {
            setErr('Informe quantidades válidas maiores que zero.');
            return;
          }
          if (q > maxQtd + 0.0001) {
            setErr(
              `Quantidade não pode ser maior que ${fmtQty(maxQtd)} (total/pendente do item).`,
            );
            return;
          }
          if (q <= 0) continue;
          if (!opItemId) {
            setErr(
              'Item sem ID (op_item_id). No Supabase rode sql/08_app_faccionista_op_itens_pendentes.sql e sql/01_app_faccionista_dashboard.sql, depois atualize a lista.',
            );
            return;
          }
          p_itens.push({ op_item_id: opItemId, quantidade: q });
        }
        if (p_itens.length === 0) {
          setErr('Informe ao menos um item com quantidade a finalizar.');
          return;
        }
      }

      const { data, error } = await supabase.rpc('app_faccionista_finalizar_itens', {
        p_op_id: op.op_id,
        p_finalizar_tudo: finalizarTudo,
        p_itens: finalizarTudo ? [] : p_itens,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      const payload = data as unknown as FinalizarResponse;
      if (!payload || typeof payload !== 'object' || !('ok' in payload) || !payload.ok) {
        const msg =
          payload && typeof payload === 'object' && 'ok' in payload && payload.ok === false && 'error' in payload
            ? String((payload as { error: string }).error)
            : 'Erro ao finalizar.';
        setErr(msg);
        return;
      }
      await onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!op) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Finalizar OP {op.numero_op}</Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            Informe a quantidade de cada variação ou finalize tudo o que estiver pendente.
          </Text>

          {loadingItens ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Carregando itens…</Text>
            </View>
          ) : itens.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              {err ?? 'Nenhum item pendente nesta OP.'}
            </Text>
          ) : (
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
            >
              {itens.map((it, idx) => {
                const key = it._rowKey ?? itemRowKey(it, idx);
                const maxQtd = quantidadeMaxInput(it);
                const totalQtd = quantidadeTotalItem(it);
                return (
                  <View
                    key={key}
                    style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                  >
                    <Text style={[styles.rowMain, { color: theme.text }]}>
                      Cor {it.cor || '—'} · Tam. {it.tamanho || '—'}
                      {it.parte?.trim() ? ` · ${it.parte}` : ''}
                    </Text>
                    <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                      Total do item: {fmtQty(totalQtd)}
                      {quantidadePendente(it) < totalQtd
                        ? ` · Pendente: ${fmtQty(quantidadePendente(it))}`
                        : ''}
                    </Text>
                    <Text style={[styles.rowMax, { color: theme.textSecondary }]}>
                      Máximo neste campo: {fmtQty(maxQtd)}
                    </Text>
                    <TextInput
                      value={qtyByItem[key] ?? ''}
                      onChangeText={(t) => {
                        const filtrado = filtrarEntradaQuantidade(t, maxQtd);
                        setQtyByItem((prev) => ({ ...prev, [key]: filtrado }));
                      }}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      placeholder={fmtQty(maxQtd)}
                      placeholderTextColor={theme.textMuted}
                      selectTextOnFocus
                      style={[
                        styles.input,
                        { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
                      ]}
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}

          {err && itens.length > 0 ? <Text style={[styles.err, { color: theme.error }]}>{err}</Text> : null}

          <Pressable
            disabled={loading || loadingItens || itens.length === 0}
            onPress={() => submit(false)}
            style={[
              styles.btn,
              { backgroundColor: theme.primary, borderColor: theme.primary, opacity: itens.length === 0 ? 0.5 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={theme.textOnPrimary} />
            ) : (
              <Text style={{ color: theme.textOnPrimary, fontWeight: '700' }}>Confirmar quantidades</Text>
            )}
          </Pressable>
          <Pressable
            disabled={loading || loadingItens || itens.length === 0}
            onPress={() => submit(true)}
            style={[
              styles.btn,
              { borderColor: theme.primary, backgroundColor: theme.surface, opacity: itens.length === 0 ? 0.5 : 1 },
            ]}
          >
            <Text style={{ color: theme.primary, fontWeight: '700' }}>Finalizar tudo (pendente)</Text>
          </Pressable>
          <Pressable disabled={loading} onPress={onClose} style={styles.cancel}>
            <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Cancelar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 28,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  loadingBox: { alignItems: 'center', paddingVertical: 24, marginBottom: 12 },
  loadingText: { marginTop: 10, fontSize: 14 },
  empty: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  list: { maxHeight: 340, marginBottom: 12 },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  rowMain: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  rowMeta: { fontSize: 12, marginBottom: 4 },
  rowMax: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
  },
  err: { fontSize: 14, marginBottom: 10 },
  btn: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancel: { alignItems: 'center', paddingVertical: 8 },
});
