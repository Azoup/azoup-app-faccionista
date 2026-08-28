import type { Theme } from '../constants/theme';
import { loadProdutoImagens } from '../lib/loadProdutoImagens';
import type { ProdutoImagemRow } from '../types/api';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  theme: Theme;
  visible: boolean;
  produtoId: string | null;
  produtoNome: string;
  onClose: () => void;
};

export function ProdutoImagensModal({ theme, visible, produtoId, produtoNome, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [imagens, setImagens] = useState<ProdutoImagemRow[]>([]);

  useEffect(() => {
    if (!visible || !produtoId) {
      setImagens([]);
      setErr(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      const r = await loadProdutoImagens(produtoId);
      if (cancelled) return;
      if (!r.ok) {
        setErr(r.error);
        setImagens([]);
      } else {
        setImagens(r.imagens);
        setErr(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, produtoId]);

  async function openImage(url: string) {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.head, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Imagens</Text>
              <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={2}>
                {produtoNome}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeHit}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>Fechar</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {loading ? (
              <View style={styles.centerPad}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Carregando imagens…</Text>
              </View>
            ) : err ? (
              <Text style={{ color: theme.error }}>{err}</Text>
            ) : imagens.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>
                Nenhuma imagem cadastrada para este produto.
              </Text>
            ) : (
              <View style={styles.grid}>
                {imagens.map((img, idx) => (
                  <Pressable
                    key={img.id}
                    onPress={() => openImage(img.url_imagem)}
                    style={({ pressed }) => [
                      styles.tile,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: img.url_imagem }}
                      style={[styles.image, { backgroundColor: theme.surfaceVariant }]}
                      resizeMode="cover"
                      accessibilityLabel={`Imagem ${idx + 1} do produto`}
                    />
                    {img.observacao?.trim() ? (
                      <Text style={[styles.caption, { color: theme.textSecondary }]} numberOfLines={3}>
                        {img.observacao.trim()}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});
