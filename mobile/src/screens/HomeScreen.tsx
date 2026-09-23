import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, API_BASE_URL, ApiError } from '../api/client'
import type { CompetitorDTO, FightDTO, UserDTO } from '../api/client'
import { FightCard } from '../components/FightCard'
import { BetSheet } from '../components/BetSheet'
import type { BetSelection } from '../components/BetSheet'
import { UpdateBanner } from '../components/UpdateBanner'
import { useOtaUpdates } from '../hooks/useOtaUpdates'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'

export function HomeScreen() {
  const { theme, dictionary, season, isPreviewing, toggleSeasonPreview, refresh } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const ota = useOtaUpdates()

  const [user, setUser] = useState<UserDTO | null>(null)
  const [fights, setFights] = useState<FightDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selection, setSelection] = useState<BetSelection | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [betError, setBetError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // O tema ativo manda na consulta: no preview, vemos o card da outra temporada.
  const activeSeason = theme.key

  const loadData = useCallback(async () => {
    try {
      const [me, card] = await Promise.all([api.getMe(), api.getFights(activeSeason)])
      setUser(me)
      setFights(card.fights)
      setLoadError(null)
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : 'Falha ao carregar dados.')
    }
  }, [activeSeason])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    void loadData().finally(() => {
      if (active) setIsLoading(false)
    })
    return () => {
      active = false
    }
  }, [loadData])

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 2800)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([loadData(), refresh()])
    setIsRefreshing(false)
  }, [loadData, refresh])

  const handlePickWinner = useCallback(
    (fight: FightDTO, competitor: CompetitorDTO, odd: number) => {
      setBetError(null)
      setSelection({ fight, competitor, odd })
    },
    [],
  )

  const handleConfirmBet = useCallback(
    async (amount: number) => {
      if (!selection || !user) return
      setIsSubmitting(true)
      setBetError(null)
      try {
        const result = await api.placeBet({
          fightId: selection.fight.id,
          chosenWinnerId: selection.competitor.id,
          amount,
        })
        setUser({ ...user, virtualCoins: result.balance })
        setSelection(null)
        setFeedback(
          `${dictionary.betPlaced} ${result.bet.potentialPayout.toFixed(2)} ${dictionary.balanceShort}`,
        )
      } catch (cause) {
        setBetError(cause instanceof ApiError ? cause.message : 'Não foi possível apostar.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [selection, user, dictionary],
  )

  const header = (
    <View>
      <View style={styles.topRow}>
        <Text style={styles.logo}>RINQ</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alternar temporada (pré-visualização)"
          onPress={toggleSeasonPreview}
          style={styles.badge}
        >
          <Text style={styles.badgeText}>
            {dictionary.seasonBadge}
            {isPreviewing ? ' · preview' : ''}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.tagline}>{theme.tagline}</Text>

      <View style={styles.walletCard}>
        <View>
          <Text style={styles.walletLabel}>{dictionary.balance}</Text>
          <Text style={styles.walletValue}>{user ? user.virtualCoins : '—'}</Text>
        </View>
        <View style={styles.walletMeta}>
          <Text style={styles.walletUser} numberOfLines={1}>
            {user?.name ?? '...'}
          </Text>
          <Text style={styles.walletSeason} numberOfLines={1}>
            {season?.label ?? theme.name}
          </Text>
        </View>
      </View>

      <UpdateBanner ota={ota} />

      <Text style={styles.sectionTitle}>{dictionary.cardTitle}</Text>
      <Text style={styles.sectionSubtitle}>{dictionary.cardSubtitle}</Text>

      {loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Text style={styles.errorHint}>API: {API_BASE_URL}</Text>
          <Pressable onPress={() => void handleRefresh()} style={styles.retry}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )

  return (
    <View style={[styles.screen, { paddingTop: insets.top + theme.spacing(2) }]}>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.palette.primary} size="large" />
          <Text style={styles.loadingText}>{dictionary.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={fights}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => <FightCard fight={item} onPickWinner={handlePickWinner} />}
          ListEmptyComponent={
            loadError ? null : <Text style={styles.empty}>{dictionary.emptyState}</Text>
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + theme.spacing(4) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={theme.palette.primary}
            />
          }
        />
      )}

      {feedback ? (
        <View style={[styles.toast, { bottom: insets.bottom + theme.spacing(3) }]}>
          <Text style={styles.toastText}>{feedback}</Text>
        </View>
      ) : null}

      <BetSheet
        selection={selection}
        balance={user?.virtualCoins ?? 0}
        isSubmitting={isSubmitting}
        error={betError}
        onClose={() => setSelection(null)}
        onConfirm={(amount) => void handleConfirmBet(amount)}
      />
    </View>
  )
}

function createStyles(theme: AppTheme) {
  const { palette, typography, radii, spacing } = theme

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    listContent: { paddingHorizontal: spacing(2) },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(2) },
    loadingText: { color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 13 },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing(1),
    },
    logo: {
      color: palette.primary,
      fontFamily: typography.fontFamily,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: typography.displayLetterSpacing * 2,
    },
    badge: {
      backgroundColor: palette.surfaceAlt,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radii.pill,
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(0.75),
      maxWidth: '58%',
    },
    badgeText: {
      color: palette.accent,
      fontFamily: typography.fontFamily,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    tagline: {
      color: palette.textMuted,
      fontFamily: typography.fontFamily,
      fontSize: 13,
      marginTop: spacing(0.5),
    },
    walletCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing(2),
      marginTop: spacing(2),
      marginBottom: spacing(2),
    },
    walletLabel: {
      color: palette.textMuted,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    walletValue: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 30,
      fontWeight: '800',
    },
    walletMeta: { alignItems: 'flex-end', maxWidth: '52%' },
    walletUser: { color: palette.text, fontFamily: typography.fontFamily, fontSize: 13 },
    walletSeason: { color: palette.primary, fontSize: 11, marginTop: spacing(0.25) },
    sectionTitle: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 18,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    sectionSubtitle: {
      color: palette.textMuted,
      fontSize: 12,
      marginBottom: spacing(2),
      marginTop: spacing(0.5),
    },
    empty: {
      color: palette.textMuted,
      fontFamily: typography.fontFamily,
      fontSize: 13,
      textAlign: 'center',
      marginTop: spacing(4),
    },
    errorCard: {
      backgroundColor: palette.surfaceAlt,
      borderColor: palette.danger,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing(2),
      marginBottom: spacing(2),
    },
    errorText: { color: palette.danger, fontSize: 13 },
    errorHint: { color: palette.textMuted, fontSize: 11, marginTop: spacing(0.5) },
    retry: {
      alignSelf: 'flex-start',
      marginTop: spacing(1.5),
      borderColor: palette.danger,
      borderWidth: 1,
      borderRadius: radii.pill,
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(0.75),
    },
    retryText: { color: palette.danger, fontSize: 11, textTransform: 'uppercase' },
    toast: {
      position: 'absolute',
      left: spacing(2),
      right: spacing(2),
      backgroundColor: palette.success,
      borderRadius: radii.md,
      padding: spacing(2),
    },
    toastText: { color: '#05080D', fontFamily: typography.fontFamily, fontWeight: '700' },
  })
}
