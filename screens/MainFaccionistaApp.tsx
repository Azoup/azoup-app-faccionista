import { AppNavMenu, type AppTab } from '../components/AppNavMenu';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useTheme } from '../contexts/ThemeContext';
import { useLayoutMode } from '../lib/useLayoutMode';
import type { SessionInfo } from '../types/session';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardScreen } from './DashboardScreen';
import { ResumoFaccionistaScreen } from './ResumoFaccionistaScreen';

type Props = {
  session: SessionInfo;
  onExit: () => void;
};

const SIDEBAR_WIDTH = 220;

export function MainFaccionistaApp({ session, onExit }: Props) {
  const { theme, isDark, toggleTheme } = useTheme();
  const layoutMode = useLayoutMode();
  const useSidebar = layoutMode === 'sidebar';
  const [tab, setTab] = useState<AppTab>('ops');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (useSidebar) setMenuOpen(false);
  }, [useSidebar]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function selectTab(next: AppTab) {
    setTab(next);
    closeMenu();
  }

  const topBar = (
    <View style={[styles.topBar, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
      {!useSidebar ? (
        <Pressable
          onPress={() => setMenuOpen((o) => !o)}
          style={styles.menuBtn}
          accessibilityRole="button"
          accessibilityLabel={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <Ionicons name={menuOpen ? 'close' : 'menu'} size={26} color={theme.text} />
        </Pressable>
      ) : (
        <View style={styles.menuBtnPlaceholder} />
      )}
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
  );

  const mainContent = (
    <View style={styles.mainColumn}>
      {topBar}
      <View style={styles.content}>
        {tab === 'ops' ? (
          <DashboardScreen session={session} embedded />
        ) : (
          <ResumoFaccionistaScreen />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={useSidebar ? ['top', 'left'] : ['top']}
    >
      <View style={styles.shell}>
        {useSidebar ? (
          <View
            style={[
              styles.sidebar,
              {
                width: SIDEBAR_WIDTH,
                backgroundColor: theme.surface,
                borderRightColor: theme.border,
              },
            ]}
          >
            <AppNavMenu theme={theme} tab={tab} onChange={selectTab} variant="sidebar" />
          </View>
        ) : null}

        <View style={styles.mainArea}>
          {mainContent}

          {!useSidebar && menuOpen ? (
            <View style={styles.drawerLayer}>
              <Pressable
                style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                onPress={closeMenu}
                accessibilityRole="button"
                accessibilityLabel="Fechar menu"
              />
              <SafeAreaView
                edges={['top', 'bottom', 'left']}
                style={[
                  styles.drawer,
                  {
                    backgroundColor: theme.surface,
                    borderRightColor: theme.border,
                  },
                ]}
              >
                <AppNavMenu
                  theme={theme}
                  tab={tab}
                  onChange={selectTab}
                  variant="drawer"
                  onNavigate={closeMenu}
                />
              </SafeAreaView>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
  },
  mainArea: {
    flex: 1,
    position: 'relative',
  },
  mainColumn: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  menuBtn: {
    padding: 4,
    marginRight: 2,
  },
  menuBtnPlaceholder: {
    width: 0,
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
  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 260,
    borderRightWidth: 1,
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
