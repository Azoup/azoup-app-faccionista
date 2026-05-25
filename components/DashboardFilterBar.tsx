import type { Theme } from '../constants/theme';
import type { EmpresaOption } from '../lib/opFilters';
import type { OpFilters } from '../lib/opFilters';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  theme: Theme;
  empresas: EmpresaOption[];
  filters: OpFilters;
  onChange: (next: OpFilters) => void;
};

export function DashboardFilterBar({ theme, empresas, filters, onChange }: Props) {
  function setEmpresa(key: string | null) {
    onChange({ ...filters, empresaKey: key });
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

      <TextInput
        value={filters.searchQuery}
        onChangeText={(searchQuery) => onChange({ ...filters, searchQuery })}
        placeholder="Buscar: empresa, produto, SKU, OP, cor, tamanho, parte…"
        placeholderTextColor={theme.textMuted}
        style={[
          styles.search,
          {
            backgroundColor: theme.surfaceVariant,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        {...(Platform.OS === 'ios' ? { clearButtonMode: 'while-editing' as const } : {})}
      />
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  search: {
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
});
