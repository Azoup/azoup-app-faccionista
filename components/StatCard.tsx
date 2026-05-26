import type { Theme } from '../constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  theme: Theme;
  label: string;
  value: string;
  hint?: string;
  accent?: 'primary' | 'success' | 'warning';
};

export function StatCard({ theme, label, value, hint, accent = 'primary' }: Props) {
  const valueColor =
    accent === 'success' ? theme.success : accent === 'warning' ? theme.primary : theme.primary;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: theme.textSecondary }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
});
