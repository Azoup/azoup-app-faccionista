import type { Theme } from '../constants/theme';
import type { FichaPayload, FichaTecnicaResponse } from '../types/api';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function fmtNum(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(n);
}

type Props = {
  theme: Theme;
  visible: boolean;
  produtoId: string | null;
  produtoNome: string;
  onClose: () => void;
};

export function FichaTecnicaModal({ theme, visible, produtoId, produtoNome, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<FichaTecnicaResponse | null>(null);

  useEffect(() => {
    if (!visible || !produtoId) {
      setPayload(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPayload(null);
      const { data, error } = await supabase.rpc('app_produto_ficha_tecnica', {
        p_produto_id: produtoId,
      });
      if (cancelled) return;
      if (error) {
        setPayload({ ok: false, error: error.message });
      } else {
        setPayload(data as unknown as FichaTecnicaResponse);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, produtoId]);

  const ficha =
    payload && payload.ok ? payload.ficha : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.head, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                Ficha técnica
              </Text>
              <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={2}>
                {produtoNome}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeHit}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>Fechar</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {loading ? (
              <View style={styles.centerPad}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Carregando…</Text>
              </View>
            ) : !payload ? (
              <Text style={{ color: theme.textMuted }}>Sem dados.</Text>
            ) : !payload.ok ? (
              <Text style={{ color: theme.error }}>{payload.error}</Text>
            ) : ficha === null ? (
              <Text style={{ color: theme.textSecondary }}>
                Não há ficha técnica cadastrada para este produto.
              </Text>
            ) : (
              <FichaBody theme={theme} ficha={ficha} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FichaBody({ theme, ficha }: { theme: Theme; ficha: FichaPayload }) {
  const partes = ficha.partes ?? [];
  const consumosTecido = ficha.consumos_tecido ?? [];
  const consumosAviamento = ficha.consumos_aviamento ?? [];

  return (
    <View>
      <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {ficha.dificuldade != null ? (
          <Text style={[styles.line, { color: theme.text }]}>
            Dificuldade: {ficha.dificuldade}/5
          </Text>
        ) : null}
        <Text style={[styles.line, { color: theme.textSecondary }]}>
          Dividido em partes: {ficha.dividido_em_partes ? 'Sim' : 'Não'}
        </Text>
        {ficha.observacao_ficha_tecnica ? (
          <Text style={[styles.obs, { color: theme.text }]}>{ficha.observacao_ficha_tecnica}</Text>
        ) : null}
      </View>

      {partes.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Partes</Text>
          {partes.map((p, i) => (
            <Text key={`${p.ordem}-${i}`} style={[styles.line, { color: theme.text }]}>
              {p.ordem}. {p.descricao}
            </Text>
          ))}
        </View>
      ) : null}

      {consumosTecido.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Consumo de tecido</Text>
          {consumosTecido.map((c) => (
            <View
              key={c.id}
              style={[styles.cardIn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.bold, { color: theme.text }]}>{c.tecido_nome}</Text>
              <Text style={[styles.small, { color: theme.textSecondary }]}>
                {c.tipo_consumo} · unidade consumo {c.unidade}
                {c.consumo_geral != null ? ` · geral ${fmtNum(c.consumo_geral)}` : ''}
              </Text>
              {c.tecido_sku?.trim() ? (
                <Text style={[styles.small, { color: theme.textMuted }]}>SKU: {c.tecido_sku}</Text>
              ) : null}
              {c.tecido_unidade?.trim() ? (
                <Text style={[styles.small, { color: theme.textMuted }]}>
                  Unidade (cadastro): {c.tecido_unidade}
                </Text>
              ) : null}
              {c.tecido_composicao?.trim() ? (
                <Text style={[styles.small, { color: theme.textMuted }]}>Composição: {c.tecido_composicao}</Text>
              ) : null}
              {c.tecido_largura != null && c.tecido_largura !== '' ? (
                <Text style={[styles.small, { color: theme.textMuted }]}>Largura: {fmtNum(c.tecido_largura)}</Text>
              ) : null}
              {c.tecido_rendimento != null && c.tecido_rendimento !== '' ? (
                <Text style={[styles.small, { color: theme.textMuted }]}>
                  Rendimento: {fmtNum(c.tecido_rendimento)}
                </Text>
              ) : null}
              {(c.tecido_cores_cadastro ?? []).length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.subLabel, { color: theme.primary }]}>Cores no cadastro do tecido</Text>
                  {(c.tecido_cores_cadastro ?? []).map((row, idx) => (
                    <Text key={idx} style={[styles.small, { color: theme.textMuted }]}>
                      {row.cor}
                      {row.sku_cor ? ` · SKU cor ${row.sku_cor}` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}
              {(c.linhas_tamanho ?? []).length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.subLabel, { color: theme.primary }]}>Consumo por variação (ficha)</Text>
                  {(c.linhas_tamanho ?? []).map((ln, idx) => (
                    <Text key={idx} style={[styles.small, { color: theme.textMuted }]}>
                      Tam. {ln.tamanho}
                      {ln.produto_cor ? ` · cor prod. ${ln.produto_cor}` : ''}
                      {ln.cor ? ` · cor ${ln.cor}` : ''} — consumo {fmtNum(ln.consumo)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {consumosAviamento.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Consumo de aviamento</Text>
          {consumosAviamento.map((c) => (
            <View
              key={c.id}
              style={[styles.cardIn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.bold, { color: theme.text }]}>{c.aviamento_nome}</Text>
              <Text style={[styles.small, { color: theme.textSecondary }]}>
                {c.tipo_consumo} · unidade consumo {c.unidade}
                {c.consumo_geral != null ? ` · geral ${fmtNum(c.consumo_geral)}` : ''}
              </Text>
              {c.aviamento_sku?.trim() ? (
                <Text style={[styles.small, { color: theme.textMuted }]}>SKU: {c.aviamento_sku}</Text>
              ) : null}
              {c.aviamento_unidade?.trim() ? (
                <Text style={[styles.small, { color: theme.textMuted }]}>
                  Unidade (cadastro): {c.aviamento_unidade}
                </Text>
              ) : null}
              {(c.aviamento_variacoes ?? []).length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.subLabel, { color: theme.primary }]}>
                    Variações no cadastro do aviamento
                  </Text>
                  {(c.aviamento_variacoes ?? []).map((row, idx) => (
                    <Text key={idx} style={[styles.small, { color: theme.textMuted }]}>
                      {row.cor}
                      {row.tamanho ? ` · tam. ${row.tamanho}` : ''}
                      {row.sku_variacao ? ` · SKU ${row.sku_variacao}` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}
              {(c.linhas_tamanho ?? []).length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.subLabel, { color: theme.primary }]}>Consumo por variação (ficha)</Text>
                  {(c.linhas_tamanho ?? []).map((ln, idx) => (
                    <Text key={idx} style={[styles.small, { color: theme.textMuted }]}>
                      Tam. {ln.tamanho}
                      {ln.produto_cor ? ` · cor prod. ${ln.produto_cor}` : ''}
                      {ln.cor ? ` · cor ${ln.cor}` : ''}
                      {ln.tamanho_aviamento ? ` · aviamento ${ln.tamanho_aviamento}` : ''} — consumo{' '}
                      {fmtNum(ln.consumo)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 4 },
  closeHit: { paddingVertical: 4, paddingLeft: 12 },
  scroll: { padding: 16, paddingBottom: 28 },
  centerPad: { paddingVertical: 40, alignItems: 'center' },
  block: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  subLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  line: { fontSize: 14, marginBottom: 4 },
  obs: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  cardIn: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  bold: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  small: { fontSize: 13, lineHeight: 18 },
});
