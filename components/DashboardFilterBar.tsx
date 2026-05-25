import type { Theme } from '../constants/theme';
import type { EmpresaOption, ListaOpFiltro, OpFilters } from '../lib/opFilters';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  theme: Theme;
  empresas: EmpresaOption[];
  filters: OpFilters;
  onChange: (next: OpFilters) => void;
};

const LISTA_OP_OPCOES: { id: ListaOpFiltro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendentes', label: 'Pendentes' },
  { id: 'finalizados', label: 'Finalizados' },
];

export function DashboardFilterBar({ theme, empresas, filters, onChange }: Props) {
  function setEmpresa(key: string | null) {
    onChange({ ...filters, empresaKey: key });
  }

  function setListaOp(listaOp: ListaOpFiltro) {
    onChange({ ...filters, listaOp });
  }

  function chipStyle(active: boolean) {
    return {
      backgroundColor: active ? theme.primary : theme.surfaceVariant,
      borderColor: active ? theme.primary : theme.border,
    };
  }

  function chipTextColor(active: boolean) {
    return active ? theme.textOnPrimary : theme.text;
  }

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.empresasRow}
      >
        <Pressable
          onPress={() => setEmpresa(null)}
          style={[
            styles.chip,
            {
              backgroundColor: !filters.empresaKey ? theme.primary : theme.surfaceVariant,
              borderColor: !filters.empresaKey ? theme.primary : theme.border,
            },
          ]}
        >
          <Text
            style={{
              color: !filters.empresaKey ? theme.textOnPrimary : theme.text,
              fontWeight: '600',
              fontSize: 12,
            }}
          >
            Todas
          </Text>
        </Pressable>
        {empresas.map((e) => {
          const active = filters.empresaKey === e.key;
          return (
            <Pressable
              key={e.key}
              onPress={() => setEmpresa(e.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.surfaceVariant,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.textOnPrimary : theme.text,
                  fontWeight: '600',
                  fontSize: 12,
                }}
                numberOfLines={1}
              >
                {e.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: theme.surfaceVariant,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          value={filters.searchQuery}
          onChangeText={(searchQuery) => onChange({ ...filters, searchQuery })}
          placeholder="Buscar: empresa, produto, SKU, OP, cor, tamanho, parte…"
          placeholderTextColor={theme.textMuted}
          style={[styles.search, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          {...(Platform.OS === 'ios' ? { clearButtonMode: 'while-editing' as const } : {})}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  empresasRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listaOpRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  searchWrap: {
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  search: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 10,
    /* ≥16px evita zoom automático no Safari/iOS ao focar o campo */
    fontSize: 16,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
});
