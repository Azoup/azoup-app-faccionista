import type { Theme } from '../constants/theme';
import {
  loadConsumoVariacoes,
  loadOpConsumo,
  salvarOpConsumo,
  type ConsumoCatalogItem,
  type ConsumoLinha,
  type ConsumoTipo,
  type ConsumoVariacao,
} from '../lib/opConsumoApi';
import type { OpRow } from '../types/api';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

type Props = {
  theme: Theme;
  visible: boolean;
  op: OpRow | null;
  tipo: ConsumoTipo;
  onClose: () => void;
};

function fmtQtd(v: number | string | null | undefined): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(n);
}

function variacaoLabel(l: { cor_estoque?: string | null; tamanho_estoque?: string | null }): string {
  return [l.cor_estoque, l.tamanho_estoque].map((x) => String(x || '').trim()).filter(Boolean).join(' · ');
}

export function OpConsumoModal({ theme, visible, op, tipo, onClose }: Props) {
  const { height: winH } = useWindowDimensions();
  const titulo = tipo === 'tecido' ? 'Tecido' : 'Aviamento';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [linhas, setLinhas] = useState<ConsumoLinha[]>([]);
  const [catalog, setCatalog] = useState<ConsumoCatalogItem[]>([]);
  const [busca, setBusca] = useState('');
  const [addItemId, setAddItemId] = useState('');
  const [addQtd, setAddQtd] = useState('');
  const [variacoes, setVariacoes] = useState<ConsumoVariacao[]>([]);
  const [addVarId, setAddVarId] = useState('');

  const load = useCallback(async () => {
    if (!op?.op_id) return;
    setLoading(true);
    setError('');
    const res = await loadOpConsumo(op.op_id, tipo);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setLinhas([]);
      setCatalog([]);
      return;
    }
    setLinhas(res.linhas);
    setCatalog(res.catalog);
  }, [op?.op_id, tipo]);

  useEffect(() => {
    if (!visible) return;
    setBusca('');
    setAddItemId('');
    setAddQtd('');
    setAddVarId('');
    setVariacoes([]);
    void load();
  }, [visible, load]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return catalog.slice(0, 12);
    return catalog.filter((c) => String(c.nome || '').toLowerCase().includes(q)).slice(0, 12);
  }, [busca, catalog]);

  async function escolherItem(item: ConsumoCatalogItem) {
    setAddItemId(item.id);
    setAddVarId('');
    setVariacoes([]);
    if (!op?.op_id) return;
    const res = await loadConsumoVariacoes(op.op_id, tipo, item.id);
    if (res.ok) {
      setVariacoes(res.variacoes);
      if (res.variacoes.length === 1) setAddVarId(res.variacoes[0].id);
    }
  }

  function incluir() {
    const item = catalog.find((c) => c.id === addItemId);
    const qtd = parseFloat(addQtd.replace(',', '.'));
    if (!item) {
      setError(tipo === 'tecido' ? 'Selecione o tecido.' : 'Selecione o aviamento.');
      return;
    }
    if (!(qtd > 0)) {
      setError('Informe a quantidade do material.');
      return;
    }
    if (variacoes.length > 0 && !addVarId) {
      setError('Selecione a variação (cor/tamanho).');
      return;
    }
    const variacao = variacoes.find((v) => v.id === addVarId) || null;
    const uid = `add-${item.id}-${variacao?.id || 'sem'}-${Date.now()}`;
    if (
      linhas.some(
        (l) =>
          !l.excluded &&
          String(l.item_id) === String(item.id) &&
          String(l.variacao_id || '') === String(variacao?.id || ''),
      )
    ) {
      setError('Esse material já está na lista.');
      return;
    }
    setLinhas((prev) => [
      ...prev,
      {
        uid,
        item_id: item.id,
        variacao_id: variacao?.id || null,
        nome: item.nome,
        unidade: null,
        cor_estoque: variacao?.cor || null,
        tamanho_estoque: variacao?.tamanho || null,
        custo_unitario: variacao?.custo ?? item.custo ?? 0,
        consumo_inicial: 0,
        consumo_atual: String(qtd),
        consumo_baixado: 0,
        excluded: false,
        from_ficha: false,
      },
    ]);
    setAddQtd('');
    setError('');
  }

  async function salvar() {
    if (!op?.op_id) return;
    setSaving(true);
    setError('');
    const res = await salvarOpConsumo(op.op_id, tipo, linhas);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  }

  const visiveis = linhas.filter((l) => !l.excluded);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              maxHeight: Math.min(winH * 0.92, 760),
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Gasto de {titulo.toLowerCase()}</Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                OP #{op?.numero_op ?? ''} · total da OP
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} disabled={saving}>
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.primary} />
              <Text style={{ color: theme.textMuted, marginTop: 8 }}>Carregando consumo…</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {visiveis.length === 0 ? (
                <Text style={{ color: theme.textMuted, marginBottom: 12 }}>
                  Nenhum {titulo.toLowerCase()} nesta OP. Inclua um material abaixo.
                </Text>
              ) : (
                visiveis.map((l) => (
                  <View
                    key={l.uid}
                    style={[styles.linha, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                  >
                    <Text style={[styles.nome, { color: theme.text }]}>{l.nome || titulo}</Text>
                    {variacaoLabel(l) ? (
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{variacaoLabel(l)}</Text>
                    ) : null}
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                      Inicial {fmtQtd(l.consumo_inicial)}
                      {l.unidade ? ` ${l.unidade}` : ''} · Já baixado {fmtQtd(l.consumo_baixado)}
                    </Text>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Atual</Text>
                    <TextInput
                      value={String(l.consumo_atual ?? '')}
                      onChangeText={(v) =>
                        setLinhas((prev) =>
                          prev.map((row) =>
                            row.uid === l.uid ? { ...row, consumo_atual: v.replace(/[^\d.,]/g, '') } : row,
                          ),
                        )
                      }
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={theme.textMuted}
                      style={[
                        styles.input,
                        { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
                      ]}
                    />
                    <Pressable
                      onPress={() =>
                        setLinhas((prev) =>
                          prev.map((row) =>
                            row.uid === l.uid ? { ...row, excluded: true, consumo_atual: '0' } : row,
                          ),
                        )
                      }
                    >
                      <Text style={{ color: theme.error, fontWeight: '700', marginTop: 6 }}>
                        Tirar da OP
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}

              <Text style={[styles.section, { color: theme.primary }]}>Incluir {titulo.toLowerCase()}</Text>
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder={`Buscar ${titulo.toLowerCase()}`}
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                ]}
              />
              {filtrados.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => void escolherItem(c)}
                  style={[
                    styles.pick,
                    {
                      borderColor: addItemId === c.id ? theme.primary : theme.border,
                      backgroundColor: theme.surface,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text }}>{c.nome}</Text>
                </Pressable>
              ))}
              {variacoes.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  {variacoes.map((v) => (
                    <Pressable
                      key={v.id}
                      onPress={() => setAddVarId(v.id)}
                      style={[
                        styles.pick,
                        {
                          borderColor: addVarId === v.id ? theme.primary : theme.border,
                          backgroundColor: theme.surface,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.text }}>
                        {[v.cor, v.tamanho, v.sku_cor].filter(Boolean).join(' · ') || 'Variação'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextInput
                value={addQtd}
                onChangeText={(v) => setAddQtd(v.replace(/[^\d.,]/g, ''))}
                placeholder="Quantidade"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant, marginTop: 8 },
                ]}
              />
              <Pressable
                onPress={incluir}
                style={[styles.secondary, { borderColor: theme.primary }]}
              >
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Adicionar</Text>
              </Pressable>

              <Pressable
                onPress={() => void salvar()}
                disabled={saving}
                style={[styles.primary, { backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Salvar gasto real</Text>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  error: { paddingHorizontal: 16, paddingTop: 10, fontSize: 13 },
  center: { padding: 32, alignItems: 'center' },
  body: { padding: 16, paddingBottom: 28 },
  linha: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  nome: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 8, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 6,
  },
  section: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 8,
  },
  pick: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 6 },
  secondary: {
    marginTop: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primary: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
