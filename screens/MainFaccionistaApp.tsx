import { AppTabBar, type AppTab } from '../components/AppTabBar';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useTheme } from '../contexts/ThemeContext';
import type { SessionInfo } from '../types/session';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardScreen } from './DashboardScreen';
import { ResumoFaccionistaScreen } from './ResumoFaccionistaScreen';

type Props = {
  session: SessionInfo;
  onExit: () => void;
};

export function MainFaccionistaApp({ session, onExit }: Props) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [tab, setTab] = useState<AppTab>('ops');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.userEmail, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
          {session.email || '—'}
          {session.vinculosCount && session.vinculosCount > 1
            ? ` · ${session.vinculosCount} vínculos`
            : ''}
        </Text>
        <ThemeToggleButton theme={theme} isDark={isDark} onToggle={toggleTheme} />
        <Pressable onPress={onExit} style={styles.sairBtn}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Sair</Text>
        </Pressable>
      </View>

      <AppTabBar theme={theme} tab={tab} onChange={setTab} />

      <View style={styles.content}>
        {tab === 'ops' ? (
          <DashboardScreen session={session} embedded />
        ) : (
          <ResumoFaccionistaScreen />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  userEmail: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '600',
  },
  sairBtn: { paddingVertical: 4, paddingHorizontal: 4, flexShrink: 0 },
  content: { flex: 1 },
});
