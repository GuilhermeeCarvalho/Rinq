import React, { useEffect, useState } from 'react'
import { Alert, Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HomeScreen } from './HomeScreen'
import { MyBetsScreen } from './MyBetsScreen'
import { ProfileScreen } from './ProfileScreen'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'

interface MainNavigatorProps {
  onLogout: () => void
}

type TabType = 'fights' | 'bets' | 'profile'

const LOGO_HEIGHT = 40

export function MainNavigator({ onLogout }: MainNavigatorProps) {
  const { theme, dictionary } = useSeasonTheme()
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<TabType>('fights')
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const styles = React.useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true))
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false))
    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  function confirmLogout() {
    Alert.alert('Sair da Conta', 'Deseja encerrar sua sessão no Rinq?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: onLogout },
    ])
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.brandBlock}>
          <Image
            source={theme.logo}
            accessibilityLabel={`${dictionary.brandMain} ${dictionary.brandSub}`}
            resizeMode="contain"
            style={{ height: LOGO_HEIGHT, width: LOGO_HEIGHT * theme.logoAspectRatio }}
          />
          <Text style={styles.brandSeasonLabel}>{dictionary.seasonBadge}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          onPress={confirmLogout}
          hitSlop={8}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.logoutButtonText}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {activeTab === 'fights' ? (
          <HomeScreen onNavigateToBets={() => setActiveTab('bets')} />
        ) : activeTab === 'bets' ? (
          <MyBetsScreen />
        ) : (
          <ProfileScreen />
        )}
      </View>

      {!isKeyboardVisible ? <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'fights' }}
          onPress={() => setActiveTab('fights')}
          style={styles.tabItem}
        >
          {activeTab === 'fights' && <View style={styles.activeMarker} />}
          <Text style={[styles.tabIcon, activeTab === 'fights' && styles.tabIconActive]}>{dictionary.tabFightsIcon}</Text>
          <Text style={[styles.tabLabel, activeTab === 'fights' && styles.tabLabelActive]}>
            {dictionary.tabFights}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'bets' }}
          onPress={() => setActiveTab('bets')}
          style={styles.tabItem}
        >
          {activeTab === 'bets' && <View style={styles.activeMarker} />}
          <Text style={[styles.tabIcon, activeTab === 'bets' && styles.tabIconActive]}>🎟️</Text>
          <Text style={[styles.tabLabel, activeTab === 'bets' && styles.tabLabelActive]}>
            {dictionary.tabBets}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'profile' }}
          onPress={() => setActiveTab('profile')}
          style={styles.tabItem}
        >
          {activeTab === 'profile' && <View style={styles.activeMarker} />}
          <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabIconActive]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            {dictionary.tabProfile}
          </Text>
        </Pressable>
      </View> : null}
    </View>
  )
}

function createStyles(theme: AppTheme) {
  const { palette, typography, radii, spacing } = theme

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(1.25),
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      backgroundColor: palette.surface,
    },
    brandBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.25), flexShrink: 1 },
    brandSeasonLabel: {
      color: palette.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      flexShrink: 1,
    },
    logoutButton: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.sm,
      backgroundColor: palette.surfaceAlt,
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(0.75),
    },
    logoutButtonText: {
      color: palette.danger,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      fontWeight: '600',
    },
    buttonPressed: {
      opacity: 0.6,
    },
    content: {
      flex: 1,
    },
    bottomBar: {
      flexDirection: 'row',
      backgroundColor: palette.surface,
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing(1.25),
      paddingBottom: spacing(0.5),
      position: 'relative',
    },
    activeMarker: {
      position: 'absolute',
      top: 0,
      left: spacing(2),
      right: spacing(2),
      height: 2,
      backgroundColor: palette.primary,
    },
    tabIcon: {
      fontSize: 18,
      marginBottom: 2,
      opacity: 0.45,
    },
    tabIconActive: {
      opacity: 1,
    },
    tabLabel: {
      color: palette.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
    },
    tabLabelActive: {
      color: palette.primary,
      fontWeight: '700',
    },
  })
}
