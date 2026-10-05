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
import { api, ApiError } from '../api/client'
import type { BetDTO } from '../api/client'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'

type FilterStatus = 'ALL' | 'PENDING' | 'WON' | 'FINISHED'

export function MyBetsScreen() {
  const { theme } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [bets, setBets] = useState<BetDTO[]>([])
  const [filter, setFilter] = useState<FilterStatus>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBets = useCallback(async () => {
    try {
      const response = await api.getMyBets()
      setBets(response.bets)
      setError(null)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao carregar suas apostas.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    void loadBets().finally(() => {
      if (mounted) setIsLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [loadBets])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadBets()
    setIsRefreshing(false)
  }, [loadBets])

  const stats = useMemo(() => {
    const totalWagered = bets.reduce((acc, b) => acc + b.amount, 0)
    const pendingBets = bets.filter((b) => b.status === 'PENDING')
    const wonBets = bets.filter((b) => b.status === 'WON')
    const totalWon = wonBets.reduce((acc, b) => acc + Math.round(b.potentialPayout), 0)
    return {
      total: bets.length,
      pendingCount: pendingBets.length,
      wonCount: wonBets.length,
      totalWagered,
      totalWon,
    }
  }, [bets])

  const filteredBets = useMemo(() => {
    if (filter === 'PENDING') return bets.filter((b) => b.status === 'PENDING')
    if (filter === 'WON') return bets.filter((b) => b.status === 'WON')
    if (filter === 'FINISHED') return bets.filter((b) => b.status !== 'PENDING')
    return bets
  }, [bets, filter])

  const renderStatusBadge = (status: BetDTO['status']) => {
    const { palette } = theme
    const byStatus: Record<BetDTO['status'], { label: string; color: string }> = {
      PENDING: { label: 'Pendente', color: palette.accent },
      WON: { label: 'Ganha', color: palette.success },
      LOST: { label: 'Perdida', color: palette.danger },
      VOID: { label: 'Estornada', color: palette.info },
    }
    const { label, color } = byStatus[status]

    return (
      <View style={[styles.statusBadge, { borderColor: color }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
      </View>
    )
  }

  const renderTicket = ({ item }: { item: BetDTO }) => {
    const dateFormatted = new Date(item.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

    const isPending = item.status === 'PENDING'
    const isWon = item.status === 'WON'
    const payoutCoins = Math.round(item.potentialPayout)

    return (
      <View style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <View style={styles.ticketIdRow}>
            <Text style={styles.ticketTag}>Bilhete</Text>
            <Text style={styles.ticketId}>#{item.id.slice(0, 8)}</Text>
          </View>
          {renderStatusBadge(item.status)}
        </View>

        <View style={styles.fightMatchup}>
          <Text style={styles.matchupFighters} numberOfLines={1}>
            {item.fight.competitorA.name} <Text style={styles.versusText}>X</Text>{' '}
            {item.fight.competitorB.name}
          </Text>
          <Text style={styles.matchupDate}>{dateFormatted}</Text>
        </View>

        <View style={styles.selectionRow}>
          <View>
            <Text style={styles.selectionLabel}>Seu palpite</Text>
            <Text style={styles.selectionName}>{item.chosenWinner.name}</Text>
          </View>
          <View style={styles.oddPill}>
            <Text style={styles.oddPillLabel}>Odd</Text>
            <Text style={styles.oddPillValue}>{item.oddAtPlacement.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.ticketDivider} />

        <View style={styles.ticketFooter}>
          <View>
            <Text style={styles.financeLabel}>Valor apostado</Text>
            <Text style={styles.financeValue}>{item.amount} moedas</Text>
          </View>

          <View style={styles.financeRight}>
            <Text style={styles.financeLabel}>
              {isWon ? 'Ganho creditado' : isPending ? 'Retorno possível' : 'Retorno'}
            </Text>
            <Text style={[styles.financeValue, isWon && styles.financeValueWon]}>
              {payoutCoins} moedas
            </Text>
          </View>
        </View>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerContainer}>
      <Text style={styles.screenTitle}>Meus bilhetes</Text>
      <Text style={styles.screenSubtitle}>Histórico e status de todas as suas apostas</Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Total apostado</Text>
          <Text style={styles.summaryValue}>{stats.totalWagered}</Text>
        </View>
        <View style={[styles.summaryCol, styles.summaryColDivided]}>
          <Text style={styles.summaryLabel}>Retorno ganho</Text>
          <Text style={[styles.summaryValue, styles.summaryValueGreen]}>{stats.totalWon}</Text>
        </View>
        <View style={[styles.summaryCol, styles.summaryColDivided]}>
          <Text style={styles.summaryLabel}>Em aberto</Text>
          <Text style={[styles.summaryValue, styles.summaryValueGold]}>{stats.pendingCount}</Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        <Pressable
          onPress={() => setFilter('ALL')}
          style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, filter === 'ALL' && styles.filterChipTextActive]}>
            Todas ({bets.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('PENDING')}
          style={[styles.filterChip, filter === 'PENDING' && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, filter === 'PENDING' && styles.filterChipTextActive]}>
            Abertas ({stats.pendingCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('WON')}
          style={[styles.filterChip, filter === 'WON' && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, filter === 'WON' && styles.filterChipTextActive]}>
            Ganhas ({stats.wonCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('FINISHED')}
          style={[styles.filterChip, filter === 'FINISHED' && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, filter === 'FINISHED' && styles.filterChipTextActive]}>
            Encerradas
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  )

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={theme.palette.primary} size="large" />
          <Text style={styles.loadingText}>Buscando seus bilhetes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBets}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          renderItem={renderTicket}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Nenhum bilhete encontrado</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'ALL'
                  ? 'Você ainda não fez nenhuma aposta nesta temporada.'
                  : 'Nenhum bilhete com o filtro selecionado.'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={theme.palette.primary}
            />
          }
        />
      )}
    </View>
  )
}

function createStyles(theme: AppTheme) {
  const { palette, typography, radii, spacing } = theme
  const body = typography.bodyFontFamily

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    listContent: { paddingHorizontal: spacing(2), paddingBottom: spacing(6) },
    headerContainer: { paddingTop: spacing(1.5), marginBottom: spacing(1) },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing(2) },
    loadingText: { color: palette.textMuted, fontFamily: body, fontSize: 14 },
    screenTitle: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 24,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    screenSubtitle: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 14,
      marginTop: spacing(0.5),
      marginBottom: spacing(2),
    },
    summaryContainer: {
      flexDirection: 'row',
      gap: spacing(1),
      marginBottom: spacing(2),
    },
    summaryCol: {
      flex: 1,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.md,
      paddingVertical: spacing(1.25),
      paddingHorizontal: spacing(1.25),
    },
    summaryColDivided: {},
    summaryLabel: { color: palette.textMuted, fontFamily: body, fontSize: 12 },
    summaryValue: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 22,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginTop: 2,
    },
    summaryValueGreen: { color: palette.success },
    summaryValueGold: { color: palette.accent },
    filterBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(1),
      marginBottom: spacing(1.5),
    },
    filterChip: {
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(0.75),
      borderRadius: radii.pill,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    filterChipActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    filterChipText: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 13,
      fontWeight: '500',
      fontVariant: ['tabular-nums'],
    },
    filterChipTextActive: {
      color: palette.primaryContrast,
      fontWeight: '700',
    },
    ticketCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.lg,
      padding: spacing(2),
      marginBottom: spacing(1.5),
    },
    ticketHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing(1),
    },
    ticketIdRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    ticketTag: { color: palette.textMuted, fontFamily: body, fontSize: 12 },
    ticketId: {
      color: palette.textMuted,
      fontFamily: typography.numericFontFamily,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: radii.pill,
      paddingHorizontal: spacing(1),
      paddingVertical: 3,
      backgroundColor: palette.surfaceAlt,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontFamily: body, fontSize: 12, fontWeight: '700' },
    fightMatchup: { marginBottom: spacing(1.5) },
    matchupFighters: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 17,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    versusText: { color: palette.primary },
    matchupDate: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 12,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    selectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: palette.surfaceAlt,
      borderRadius: radii.md,
      padding: spacing(1.25),
    },
    selectionLabel: { color: palette.textMuted, fontFamily: body, fontSize: 12 },
    selectionName: {
      color: palette.text,
      fontFamily: body,
      fontSize: 15,
      fontWeight: '600',
      marginTop: 2,
    },
    oddPill: { alignItems: 'flex-end' },
    oddPillLabel: { color: palette.textMuted, fontFamily: body, fontSize: 12 },
    oddPillValue: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 18,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    ticketDivider: {
      height: 1,
      backgroundColor: palette.border,
      marginVertical: spacing(1.5),
    },
    ticketFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    financeLabel: { color: palette.textMuted, fontFamily: body, fontSize: 12 },
    financeValue: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 15,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      marginTop: 2,
    },
    financeRight: { alignItems: 'flex-end' },
    financeValueWon: { color: palette.success, fontWeight: '700' },
    errorBox: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.danger,
      borderRadius: radii.sm,
      padding: spacing(1.5),
      marginBottom: spacing(1.5),
    },
    errorText: { color: palette.danger, fontFamily: body, fontSize: 13 },
    emptyContainer: {
      paddingVertical: spacing(5),
      paddingHorizontal: spacing(3),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: palette.border,
      borderRadius: radii.lg,
      marginTop: spacing(1),
    },
    emptyTitle: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 17,
      fontWeight: typography.displayWeight,
      textTransform: typography.displayTransform,
      marginBottom: 4,
    },
    emptySubtitle: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
  })
}
