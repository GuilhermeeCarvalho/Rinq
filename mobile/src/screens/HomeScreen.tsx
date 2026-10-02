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

export interface HomeScreenProps {
  onNavigateToBets?: () => void
}

export function HomeScreen({ onNavigateToBets }: HomeScreenProps = {}) {
  const { theme, dictionary, season, refresh } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const ota = useOtaUpdates()

  const [user, setUser] = useState<UserDTO | null>(null)
  const [fights, setFights] = useState<FightDTO[]>([])
  const [openBets, setOpenBets] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selection, setSelection] = useState<BetSelection | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [betError, setBetError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isClaimingBonus, setIsClaimingBonus] = useState(false)

  const activeSeason = theme.key

  const loadData = useCallback(async () => {
    try {
      const [me, card, myBets] = await Promise.all([
        api.getMe(),
        api.getFights(activeSeason),
        api.getMyBets().catch(() => null),
      ])
      setUser(me)
      setFights(card.fights)
      if (myBets) setOpenBets(myBets.bets.filter((bet) => bet.status === 'PENDING').length)
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
        setOpenBets((count) => (count ?? 0) + 1)
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

  const handleClaimBonus = useCallback(async () => {
    setIsClaimingBonus(true)
    try {
      const res = await api.claimDailyBonus()
      if (user) {
        setUser({ ...user, virtualCoins: res.virtualCoins })
      }
      setFeedback(`+${res.bonusAdded} moedas adicionadas à sua carteira!`)
    } catch (cause) {
      setFeedback(cause instanceof ApiError ? cause.message : 'Falha ao resgatar bônus.')
    } finally {
      setIsClaimingBonus(false)
    }
  }, [user])

  const upcomingCount = fights.filter((fight) => !fight.isFinished).length

  const header = (
    <View style={styles.headerContainer}>
      <View style={styles.walletCard}>
        <View style={styles.walletAccent} />
        <View style={styles.walletBody}>
          <View style={styles.walletTop}>
            <View style={styles.walletLeft}>
              <Text style={styles.walletLabel}>{dictionary.balance}</Text>
              <Text style={styles.walletValue}>
                {user ? user.virtualCoins.toLocaleString('pt-BR') : '—'}
                <Text style={styles.walletUnit}> {dictionary.balanceShort}</Text>
              </Text>
              <Text style={styles.walletUser} numberOfLines={1}>
                {user?.name ?? '...'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resgatar moedas de bônus diário"
              onPress={() => void handleClaimBonus()}
              disabled={isClaimingBonus}
              style={({ pressed }) => [
                styles.bonusButton,
                pressed && styles.buttonPressed,
                isClaimingBonus && styles.buttonDisabled,
              ]}
            >
              {isClaimingBonus ? (
                <ActivityIndicator color={theme.palette.primaryContrast} size="small" />
              ) : (
                <>
                  <Text style={styles.bonusButtonValue}>+500</Text>
                  <Text style={styles.bonusButtonText}>Bônus diário</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.walletStats}>
            <View style={styles.walletStat}>
              <Text style={styles.walletStatValue}>{openBets ?? '—'}</Text>
              <Text style={styles.walletStatLabel}>
                {openBets === 1 ? 'aposta aberta' : 'apostas abertas'}
              </Text>
            </View>
            <View style={[styles.walletStat, styles.walletStatDivided]}>
              <Text style={styles.walletStatValue}>{upcomingCount}</Text>
              <Text style={styles.walletStatLabel}>
                {upcomingCount === 1 ? 'combate marcado' : 'combates marcados'}
              </Text>
            </View>
            {onNavigateToBets ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver minhas apostas"
                onPress={onNavigateToBets}
                hitSlop={8}
                style={({ pressed }) => [styles.walletLink, pressed && styles.buttonPressed]}
              >
                <Text style={styles.walletLinkText}>Ver apostas →</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <UpdateBanner ota={ota} />

      <View style={styles.cardHeaderBox}>
        <Text style={styles.sectionEyebrow}>{dictionary.arena}</Text>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{dictionary.cardTitle}</Text>
          {fights.length > 0 ? (
            <Text style={styles.sectionCount}>
              {fights.length} {fights.length === 1 ? 'combate' : 'combates'}
            </Text>
          ) : null}
        </View>
        <Text style={styles.sectionSubtitle}>{dictionary.cardSubtitle}</Text>
      </View>

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
    <View style={[styles.screen, { paddingTop: theme.spacing(1.5) }]}>
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
            loadError ? null : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>{dictionary.tabFightsIcon}</Text>
                <Text style={styles.emptyTitle}>{dictionary.emptyState}</Text>
                <Text style={styles.emptyText}>
                  Os próximos combates aparecem aqui assim que forem marcados. Puxe para atualizar.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleRefresh()}
                  disabled={isRefreshing}
                  style={({ pressed }) => [styles.emptyButton, pressed && styles.buttonPressed]}
                >
                  {isRefreshing ? (
                    <ActivityIndicator color={theme.palette.primary} size="small" />
                  ) : (
                    <Text style={styles.emptyButtonText}>Atualizar</Text>
                  )}
                </Pressable>
              </View>
            )
          }
          contentContainerStyle={[
            styles.listContent,
            fights.length === 0 && styles.listContentEmpty,
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
  const body = typography.bodyFontFamily

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    listContent: { paddingHorizontal: spacing(2) },
    listContentEmpty: { flexGrow: 1 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(2) },
    loadingText: { color: palette.textMuted, fontFamily: body, fontSize: 14 },
    headerContainer: { marginBottom: spacing(0.5) },
    walletCard: {
      flexDirection: 'row',
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.lg,
      overflow: 'hidden',
      marginBottom: spacing(3),
      shadowColor: palette.glow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 2,
    },
    walletAccent: { width: 4, backgroundColor: palette.primary },
    walletBody: { flex: 1, padding: spacing(2) },
    walletTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing(1.5),
    },
    walletLeft: { flex: 1 },
    walletLabel: { color: palette.textMuted, fontFamily: body, fontSize: 13 },
    walletValue: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 34,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginTop: 2,
    },
    walletUnit: {
      color: palette.accent,
      fontFamily: body,
      fontSize: 15,
      fontWeight: '600',
    },
    walletUser: { color: palette.textMuted, fontFamily: body, fontSize: 13, marginTop: 2 },
    bonusButton: {
      backgroundColor: palette.primary,
      borderRadius: radii.md,
      paddingHorizontal: spacing(1.75),
      paddingVertical: spacing(1),
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 96,
      minHeight: 52,
    },
    bonusButtonValue: {
      color: palette.primaryContrast,
      fontFamily: typography.numericFontFamily,
      fontSize: 18,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    bonusButtonText: {
      color: palette.primaryContrast,
      fontFamily: body,
      fontSize: 11,
      fontWeight: '600',
    },
    walletStats: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing(2),
      paddingTop: spacing(1.5),
      borderTopWidth: 1,
      borderTopColor: palette.border,
    },
    walletStat: { paddingRight: spacing(1.5) },
    walletStatDivided: {
      paddingLeft: spacing(1.5),
      borderLeftWidth: 1,
      borderLeftColor: palette.border,
    },
    walletStatValue: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 17,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    walletStatLabel: { color: palette.textMuted, fontFamily: body, fontSize: 12 },
    walletLink: { marginLeft: 'auto', paddingVertical: spacing(0.5) },
    walletLinkText: {
      color: palette.primary,
      fontFamily: body,
      fontSize: 14,
      fontWeight: '700',
    },
    cardHeaderBox: { marginBottom: spacing(2) },
    sectionEyebrow: {
      color: palette.accent,
      fontFamily: body,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 2,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing(1),
    },
    sectionTitle: {
      flexShrink: 1,
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 24,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    sectionCount: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
    },
    sectionSubtitle: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 14,
      marginTop: spacing(0.5),
    },
    buttonPressed: { opacity: 0.75 },
    buttonDisabled: { opacity: 0.6 },
    emptyCard: {
      flexGrow: 1,
      minHeight: 280,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderStyle: 'dashed',
      borderRadius: radii.lg,
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(5),
      marginBottom: spacing(2),
    },
    emptyIcon: { fontSize: 52, marginBottom: spacing(2) },
    emptyTitle: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 18,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
      textAlign: 'center',
    },
    emptyText: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: spacing(1),
      maxWidth: 280,
    },
    emptyButton: {
      marginTop: spacing(2.5),
      borderWidth: 1,
      borderColor: palette.primary,
      borderRadius: radii.md,
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(1.25),
      minWidth: 140,
      alignItems: 'center',
    },
    emptyButtonText: {
      color: palette.primary,
      fontFamily: body,
      fontSize: 14,
      fontWeight: '700',
    },
    errorCard: {
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing(2),
      marginBottom: spacing(2),
    },
    errorText: { color: palette.danger, fontFamily: body, fontSize: 14, fontWeight: '600' },
    errorHint: { color: palette.textMuted, fontFamily: body, fontSize: 12, marginTop: spacing(0.5) },
    retry: {
      alignSelf: 'flex-start',
      marginTop: spacing(1.5),
      borderColor: palette.danger,
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(0.75),
    },
    retryText: { color: palette.danger, fontFamily: body, fontSize: 13, fontWeight: '600' },
    toast: {
      position: 'absolute',
      left: spacing(2),
      right: spacing(2),
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.success,
      borderRadius: radii.md,
      paddingVertical: spacing(1.5),
      paddingHorizontal: spacing(2),
    },
    toastText: {
      color: palette.text,
      fontFamily: body,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
  })
}
