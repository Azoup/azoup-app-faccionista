import type { Theme } from '../constants/theme';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  theme: Theme;
  isDark: boolean;
  onToggle: () => void;
};

export function ThemeToggleButton({ theme, isDark, onToggle }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: theme.surfaceVariant,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.icon, { color: theme.primary }]}>{isDark ? '☀' : '☾'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
});
