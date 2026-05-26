import type { Theme } from '../constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type AppTab = 'ops' | 'resumo';

type Props = {
  theme: Theme;
  tab: AppTab;
  onChange: (tab: AppTab) => void;
};

export function AppTabBar({ theme, tab, onChange }: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Pressable
        onPress={() => onChange('ops')}
        style={[
          styles.tab,
          tab === 'ops' && { borderBottomColor: theme.primary },
          tab !== 'ops' && { borderBottomColor: 'transparent' },
        ]}
      >
        <Text
          style={{
            color: tab === 'ops' ? theme.primary : theme.textMuted,
            fontWeight: tab === 'ops' ? '800' : '600',
            fontSize: 14,
          }}
        >
          OPs
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('resumo')}
        style={[
          styles.tab,
          tab === 'resumo' && { borderBottomColor: theme.primary },
          tab !== 'resumo' && { borderBottomColor: 'transparent' },
        ]}
      >
        <Text
          style={{
            color: tab === 'resumo' ? theme.primary : theme.textMuted,
            fontWeight: tab === 'resumo' ? '800' : '600',
            fontSize: 14,
          }}
        >
          Resumo
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
  },
});
