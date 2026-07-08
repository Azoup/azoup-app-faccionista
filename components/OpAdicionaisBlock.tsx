import type { Theme } from '../constants/theme';
import { parseAdicionaisPedido } from '../lib/formatAdicionaisPedido';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  theme: Theme;
  adicionaisPedido?: string | null;
};

export function OpAdicionaisBlock({ theme, adicionaisPedido }: Props) {
  const linhas = parseAdicionaisPedido(adicionaisPedido);
  if (linhas.length === 0) return null;

  return (
    <View style={[styles.block, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.primary }]}>Adicionais</Text>
      {linhas.map((linha, idx) => (
        <View
          key={`${idx}-${linha}`}
          style={[styles.row, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
        >
          <Text style={[styles.text, { color: theme.text }]}>{linha}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
  },
});
