import type { Theme } from '../constants/theme';
import {
  combineDateAndTime,
  formatDateTimeBr,
  formatTimerHHMMSS,
  maskTempoHm,
  maskTempoHms,
  parseManualTempoToSeconds,
  todayIsoDate,
} from '../lib/pausaTempo';
import {
  insertOpPausa,
  loadOpPausaContext,
  loadOpPausas,
  quemParouLabel,
} from '../lib/opPausas';
import type { OpPausaContext, OpPausaRow, OpRow } from '../types/api';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
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
  onClose: () => void;
};

type ViewMode = 'list' | 'form';

export function OpPausaModal({ theme, visible, op, onClose }: Props) {
  const { height: winH } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [ctx, setCtx] = useState<OpPausaContext | null>(null);
  const [pausas, setPausas] = useState<OpPausaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');

  const [duracaoHms, setDuracaoHms] = useState('');
  const [inicioDate, setInicioDate] = useState('');
  const [inicioHora, setInicioHora] = useState('');
  const [fimDate, setFimDate] = useState('');
  const [fimHora, setFimHora] = useState('');
  const [observacao, setObservacao] = useState('');

  const resetForm = useCallback(() => {
    setDuracaoHms('');
    setInicioDate('');
    setInicioHora('');
    setFimDate('');
    setFimHora('');
    setObservacao('');
    setFormError('');
  }, []);

  const loadContext = useCallback(async () => {
    if (!op?.op_id) {
      setCtx(null);
      return;
    }
    setLoadingCtx(true);
    const res = await loadOpPausaContext(op.op_id, op.fase_nome);
    if (!res.ok) {
      setCtx(null);
      setLoadError(res.error);
    } else {
      setCtx(res.ctx);
      setLoadError('');
    }
    setLoadingCtx(false);
  }, [op?.op_id, op?.fase_nome]);

  const loadPausas = useCallback(async () => {
    if (!ctx?.cliente_id_tenant || !ctx?.op_id) {
      setPausas([]);
      return;
    }
    setLoading(true);
    const res = await loadOpPausas(ctx.cliente_id_tenant, ctx.op_id);
    if (!res.ok) {
      setPausas([]);
      setLoadError(res.error);
    } else {
      setPausas(res.pausas);
    }
    setLoading(false);
  }, [ctx?.cliente_id_tenant, ctx?.op_id]);

  useEffect(() => {
    if (!visible || !op?.op_id) return;
    setViewMode('list');
    resetForm();
    setLoadError('');
    void loadContext();
  }, [visible, op?.op_id, loadContext, resetForm]);

  useEffect(() => {
    if (!visible || !ctx) return;
    void loadPausas();
  }, [visible, ctx, loadPausas]);

  useEffect(() => {
    if (!inicioDate || !fimDate) return;
    const ini = combineDateAndTime(inicioDate, inicioHora || '00:00');
    const fim = combineDateAndTime(fimDate, fimHora || '00:00');
    if (!ini || !fim) return;
    const secs = Math.floor((new Date(fim).getTime() - new Date(ini).getTime()) / 1000);
    if (secs > 0) setDuracaoHms(formatTimerHHMMSS(secs));
  }, [inicioDate, inicioHora, fimDate, fimHora]);

  const openForm = () => {
    resetForm();
    setViewMode('form');
  };

  const resolveDuracaoSegundos = (): number => {
    const typed = parseManualTempoToSeconds(duracaoHms);
    if (typed != null && typed > 0) return typed;
    if (inicioDate && fimDate) {
      const ini = combineDateAndTime(inicioDate, inicioHora || '00:00');
      const fim = combineDateAndTime(fimDate, fimHora || '00:00');
      if (ini && fim) {
        const secs = Math.floor((new Date(fim).getTime() - new Date(ini).getTime()) / 1000);
        if (secs > 0) return secs;
      }
    }
    return 0;
  };

  const handleSave = async () => {
    setFormError('');
    if (!ctx) {
      setFormError('Contexto da OP indisponível. Feche e tente novamente.');
      return;
    }
    const duracao = resolveDuracaoSegundos();
    if (!(duracao > 0)) {
      setFormError('Informe a duração (HH:MM:SS) ou início e término da parada.');
      return;
    }

    const inicioIso = inicioDate ? combineDateAndTime(inicioDate, inicioHora || '00:00') : null;
    const fimIso = fimDate ? combineDateAndTime(fimDate, fimHora || '00:00') : null;

    setSaving(true);
    const res = await insertOpPausa({
      ctx,
      usuarioNome: ctx.faccionista_nome,
      duracaoSegundos: duracao,
      inicioEm: inicioIso,
      fimEm: fimIso,
      observacao,
    });
    setSaving(false);

    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    await loadPausas();
    setViewMode('list');
    resetForm();
  };

  const handleClose = () => {
    if (saving) return;
    setViewMode('list');
    resetForm();
    onClose();
  };

  const faseNome = ctx?.fase_nome || op?.fase_nome || 'Fila de Produção';
  const cardMaxH = Math.min(winH * 0.9, 720);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { maxHeight: cardMaxH, backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.text }]}>
                {viewMode === 'form' ? 'Adicionar parada' : 'Motivo pausa'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
                OP #{op?.numero_op ?? ''} · {faseNome}
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={8} disabled={saving}>
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          {loadError && viewMode === 'list' ? (
            <Text style={[styles.errorText, { color: theme.error }]}>{loadError}</Text>
          ) : null}

          {loadingCtx && !ctx ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.muted, { color: theme.textMuted }]}>Carregando OP…</Text>
            </View>
          ) : viewMode === 'list' ? (
            <>
              <Pressable
                onPress={openForm}
                disabled={!ctx || loadingCtx}
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: theme.primary },
                  (!ctx || loadingCtx) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>Adicionar parada</Text>
              </Pressable>
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={{ paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
              >
                {loading ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator color={theme.primary} />
                    <Text style={[styles.muted, { color: theme.textMuted }]}>Carregando paradas…</Text>
                  </View>
                ) : !pausas.length ? (
                  <Text style={[styles.muted, { color: theme.textMuted }]}>
                    Nenhuma parada cadastrada nesta OP.
                  </Text>
                ) : (
                  pausas.map((p) => (
                    <View
                      key={p.id}
                      style={[
                        styles.pausaCard,
                        { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.pausaFase, { color: theme.text }]} numberOfLines={1}>
                        {p.fase_nome || 'Fila de Produção'}
                      </Text>
                      <Text style={[styles.pausaMeta, { color: theme.textSecondary }]}>
                        Usuário {p.usuario_nome || '—'}
                      </Text>
                      <Text style={[styles.pausaMeta, { color: theme.textSecondary }]}>
                        {p.operador_nome ? 'Operador' : 'Facci.'} {quemParouLabel(p)}
                      </Text>
                      <Text style={[styles.pausaMeta, { color: theme.textSecondary }]}>
                        Tempo {formatTimerHHMMSS(p.duracao_segundos)}
                      </Text>
                      {p.inicio_em || p.fim_em ? (
                        <Text style={[styles.pausaMeta, { color: theme.textSecondary }]}>
                          {p.inicio_em ? formatDateTimeBr(p.inicio_em) : '—'}
                          {' → '}
                          {p.fim_em ? formatDateTimeBr(p.fim_em) : '—'}
                        </Text>
                      ) : null}
                      {p.observacao ? (
                        <Text
                          style={[styles.pausaObs, { color: theme.text }]}
                          numberOfLines={4}
                        >
                          {p.observacao}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {formError ? (
                <Text style={[styles.errorText, { color: theme.error }]}>{formError}</Text>
              ) : null}

              <Text style={[styles.label, { color: theme.textSecondary }]}>Faccionista</Text>
              <Text style={[styles.readonlyValue, { color: theme.text }]}>
                {ctx?.faccionista_nome || '—'}
              </Text>

              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
                Duração (HH:MM:SS)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                ]}
                value={duracaoHms}
                onChangeText={(v) => setDuracaoHms(maskTempoHms(v))}
                placeholder="00:00:00"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={8}
              />

              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
                Início (opcional)
              </Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.dateInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                  ]}
                  value={inicioDate}
                  onChangeText={setInicioDate}
                  placeholder={todayIsoDate()}
                  placeholderTextColor={theme.textMuted}
                  maxLength={10}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.timeInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                  ]}
                  value={inicioHora}
                  onChangeText={(v) => setInicioHora(maskTempoHm(v))}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>

              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
                Término (opcional)
              </Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.dateInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                  ]}
                  value={fimDate}
                  onChangeText={setFimDate}
                  placeholder={todayIsoDate()}
                  placeholderTextColor={theme.textMuted}
                  maxLength={10}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.timeInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                  ]}
                  value={fimHora}
                  onChangeText={(v) => setFimHora(maskTempoHm(v))}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>

              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
                Motivo / observação
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant },
                ]}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Descreva o motivo da parada (opcional)"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.formActions}>
                <Pressable
                  onPress={() => {
                    resetForm();
                    setViewMode('list');
                  }}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.btnSecondary,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: '600' }}>Voltar</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSave()}
                  disabled={saving || !ctx}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    { backgroundColor: theme.primary },
                    (saving || !ctx) && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Salvar</Text>
                  )}
                </Pressable>
              </View>
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
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  listScroll: {
    maxHeight: 420,
    paddingHorizontal: 16,
  },
  centerBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  muted: { fontSize: 14, textAlign: 'center' },
  pausaCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  pausaFase: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  pausaMeta: { fontSize: 13, marginBottom: 2 },
  pausaObs: { fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  readonlyValue: { fontSize: 15, marginTop: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 6,
  },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1.4 },
  timeInput: { flex: 0.8 },
  textArea: { minHeight: 80, paddingTop: 10 },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnPrimaryText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  errorText: { fontSize: 13, marginBottom: 8, paddingHorizontal: 16, paddingTop: 8 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
