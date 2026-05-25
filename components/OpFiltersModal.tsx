import type { Theme } from '../constants/theme';
import {
  defaultOpFilters,
  type EmpresaOption,
  type OpFilters,
} from '../lib/opFilters';
import { useEffect, useState } from 'react';
import {
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

type Props = {
  theme: Theme;
  visible: boolean;
  empresas: EmpresaOption[];
  initial: OpFilters;
  onClose: () => void;
  onApply: (filters: OpFilters) => void;
};

export function OpFiltersModal({ theme, visible, empresas, initial, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<OpFilters>(initial);

  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  function setField<K extends keyof OpFilters>(key: K, value: OpFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Filtros</Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: theme.textSecondary }]}>Número da OP</Text>
            <TextInput
              value={draft.numeroOpSearch}
              onChangeText={(t) => setField('numeroOpSearch', t.replace(/\D/g, ''))}
              placeholder="Ex.: 123"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              style={[styles.input, inputStyle(theme)]}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Empresa</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <Pressable
                onPress={() => setField('empresaKey', null)}
                style={[
                  styles.chip,
                  chipStyle(theme, draft.empresaKey === null),
                ]}
              >
                <Text style={{ color: draft.empresaKey === null ? theme.textOnPrimary : theme.text }}>
                  Todas
                </Text>
              </Pressable>
              {empresas.map((e) => (
                <Pressable
                  key={e.key}
                  onPress={() => setField('empresaKey', e.key)}
                  style={[styles.chip, chipStyle(theme, draft.empresaKey === e.key)]}
                >
                  <Text
                    style={{ color: draft.empresaKey === e.key ? theme.textOnPrimary : theme.text }}
                    numberOfLines={1}
                  >
                    {e.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Data de entrega</Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={[styles.subLabel, { color: theme.textMuted }]}>De</Text>
                <TextInput
                  value={draft.dataEntregaDe}
                  onChangeText={(t) => setField('dataEntregaDe', t)}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, inputStyle(theme)]}
                />
              </View>
              <View style={styles.half}>
                <Text style={[styles.subLabel, { color: theme.textMuted }]}>Até</Text>
                <TextInput
                  value={draft.dataEntregaAte}
                  onChangeText={(t) => setField('dataEntregaAte', t)}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, inputStyle(theme)]}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Ordenar por entrega</Text>
            <View style={styles.sortRow}>
              <Pressable
                onPress={() => setField('sortEntrega', 'asc')}
                style={[styles.sortBtn, sortStyle(theme, draft.sortEntrega === 'asc')]}
              >
                <Text style={{ color: draft.sortEntrega === 'asc' ? theme.textOnPrimary : theme.text, fontWeight: '600' }}>
                  Mais próxima primeiro
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setField('sortEntrega', 'desc')}
                style={[styles.sortBtn, sortStyle(theme, draft.sortEntrega === 'desc')]}
              >
                <Text style={{ color: draft.sortEntrega === 'desc' ? theme.textOnPrimary : theme.text, fontWeight: '600' }}>
                  Mais distante primeiro
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                onApply(defaultOpFilters);
                onClose();
              }}
              style={[styles.btn, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Limpar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onApply(draft);
                onClose();
              }}
              style={[styles.btn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <Text style={{ color: theme.textOnPrimary, fontWeight: '700' }}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function inputStyle(theme: Theme) {
  return {
    backgroundColor: theme.surfaceVariant,
    color: theme.text,
    borderColor: theme.border,
  };
}

function chipStyle(theme: Theme, active: boolean) {
  return {
    backgroundColor: active ? theme.primary : theme.surfaceVariant,
    borderColor: active ? theme.primary : theme.border,
  };
}

function sortStyle(theme: Theme, active: boolean) {
  return {
    backgroundColor: active ? theme.primary : theme.surfaceVariant,
    borderColor: active ? theme.primary : theme.border,
  };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 24,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  scroll: { maxHeight: 420 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  subLabel: { fontSize: 11, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 12,
  },
  chipRow: { flexDirection: 'row', marginBottom: 12, maxHeight: 44 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 220,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  sortRow: { gap: 10, marginBottom: 8 },
  sortBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
});
