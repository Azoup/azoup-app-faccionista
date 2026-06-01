import type { Theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type AppTab = 'ops' | 'resumo';

type NavItem = {
  id: AppTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'ops', label: 'OPs', icon: 'list-outline' },
  { id: 'resumo', label: 'Resumo', icon: 'bar-chart-outline' },
];

type Props = {
  theme: Theme;
  tab: AppTab;
  onChange: (tab: AppTab) => void;
  variant: 'sidebar' | 'drawer';
  onNavigate?: () => void;
};

export function AppNavMenu({ theme, tab, onChange, variant, onNavigate }: Props) {
  function select(next: AppTab) {
    onChange(next);
    onNavigate?.();
  }

  return (
    <View style={variant === 'sidebar' ? styles.sidebarWrap : styles.drawerWrap}>
      {variant === 'sidebar' ? (
        <Text style={[styles.brand, { color: theme.primary }]}>App Faccionista</Text>
      ) : null}
      {NAV_ITEMS.map((item) => {
        const active = tab === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => select(item.id)}
            style={({ pressed }) => [
              styles.item,
              variant === 'sidebar' && styles.itemSidebar,
              {
                backgroundColor: active ? theme.surfaceVariant : 'transparent',
                borderLeftColor: active ? theme.primary : 'transparent',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={22}
              color={active ? theme.primary : theme.textMuted}
            />
            <Text
              style={{
                color: active ? theme.primary : theme.text,
                fontWeight: active ? '800' : '600',
                fontSize: 15,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarWrap: {
    paddingTop: 8,
    paddingHorizontal: 8,
    flex: 1,
  },
  drawerWrap: {
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  brand: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    marginLeft: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  itemSidebar: {
    borderLeftWidth: 3,
    borderRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
});
