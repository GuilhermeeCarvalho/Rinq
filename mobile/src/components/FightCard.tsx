import React, { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { CompetitorDTO, FightDTO } from '../api/client'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'

export interface FightCardProps {
  fight: FightDTO
  onViewFighter?: (fighter: CompetitorDTO) => void
  onPickWinner: (fight: FightDTO, competitor: CompetitorDTO, odd: number) => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function FightCard({ fight, onPickWinner, onViewFighter }: FightCardProps) {
  const { theme, dictionary } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const bettingClosed = fight.isFinished || fight.bettingOpen === false
  const renderCorner = (
    competitor: CompetitorDTO,
    odd: number,
    isWinner: boolean,
    cornerLabel: string,
    align: 'left' | 'right',
  ) => (
    <View style={[styles.corner, align === 'right' && styles.cornerRight]}>
      <Text style={styles.cornerTag}>{cornerLabel}</Text>

      <Text
        style={[styles.name, isWinner && styles.nameWinner, align === 'right' && styles.textRight]}
        numberOfLines={2}
        accessibilityRole={onViewFighter ? 'button' : undefined}
        onPress={onViewFighter ? () => onViewFighter(competitor) : undefined}
      >
        {competitor.name}
      </Text>

      <Text style={[styles.team, align === 'right' && styles.textRight]} numberOfLines={1}>
        {competitor.team}
      </Text>

      <Text style={[styles.spec, align === 'right' && styles.textRight]} numberOfLines={1}>
        {competitor.recordAvailable === false ? 'Cartel indisponível' : `${competitor.spec.style} · ${competitor.record.summary}`}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${dictionary.betAction} em ${competitor.name}, odd ${odd.toFixed(2)}`}
        disabled={bettingClosed}
        onPress={() => onPickWinner(fight, competitor, odd)}
        style={({ pressed }) => [
          styles.oddTile,
          pressed && styles.oddTilePressed,
          bettingClosed && styles.oddTileDisabled,
          isWinner && styles.oddTileWinner,
        ]}
      >
        <Text
          style={[
            styles.oddValue,
            isWinner && { color: theme.palette.success },
            fight.isFinished && !isWinner && { color: theme.palette.textMuted },
          ]}
        >
          {fight.bettingOpen === false && !fight.isFinished ? '—' : odd.toFixed(2)}
        </Text>
        <Text style={styles.oddLabel}>
          {fight.isFinished ? (isWinner ? dictionary.winner : '—') : bettingClosed ? 'Apostas fechadas' : dictionary.betAction}
        </Text>
      </Pressable>
    </View>
  )

  const winnerName =
    fight.winnerId === fight.competitorA.id ? fight.competitorA.name : fight.competitorB.name

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.weightChip}>
          <Text style={styles.weight}>{fight.competitorA.spec.weight}</Text>
        </View>
        <Text style={[styles.date, fight.isFinished && styles.dateFinished]}>
          {fight.isFinished ? dictionary.finished : formatDate(fight.scheduledAt)}
        </Text>
      </View>

      <View style={styles.body}>
        {renderCorner(
          fight.competitorA,
          fight.odds.a,
          fight.winnerId === fight.competitorA.id,
          'Canto 1',
          'left',
        )}

        <View style={styles.versusColumn}>
          <View style={styles.versusLine} />
          <View style={styles.versusBadge}>
            <Text style={styles.versusText}>{dictionary.versus}</Text>
          </View>
          <View style={styles.versusLine} />
        </View>

        {renderCorner(
          fight.competitorB,
          fight.odds.b,
          fight.winnerId === fight.competitorB.id,
          'Canto 2',
          'right',
        )}
      </View>

      {fight.isFinished ? (
        <View style={styles.resultRow}>
          <Text style={[styles.resultText, fight.isDraw && styles.resultTextDraw]}>
            {fight.isDraw
              ? `${dictionary.draw} — todas as apostas foram estornadas`
              : fight.winnerId ? `${dictionary.winner}: ${winnerName}` : 'Sem vencedor confirmado'}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: AppTheme) {
  const { palette, typography, radii, spacing } = theme

  return StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: spacing(2),
      marginBottom: spacing(2),
      shadowColor: palette.glow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing(1.75),
      paddingBottom: spacing(1.25),
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    weightChip: {
      backgroundColor: palette.surfaceAlt,
      borderRadius: radii.sm,
      paddingHorizontal: spacing(1),
      paddingVertical: 3,
    },
    weight: {
      color: palette.accent,
      fontFamily: typography.fontFamily,
      fontSize: 12,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    date: {
      color: palette.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    dateFinished: { color: palette.danger },
    body: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    corner: { flex: 1 },
    cornerRight: { alignItems: 'flex-end' },
    textRight: { textAlign: 'right' },
    cornerTag: {
      color: palette.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 11,
      marginBottom: 4,
    },
    name: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 19,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
      lineHeight: 23,
      minHeight: 46,
    },
    nameWinner: { color: palette.success },
    team: {
      color: palette.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      marginTop: 2,
    },
    spec: {
      color: palette.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      marginTop: 2,
      marginBottom: spacing(1.5),
      fontVariant: ['tabular-nums'],
    },
    versusColumn: {
      width: 44,
      alignItems: 'center',
    },
    versusLine: {
      flex: 1,
      width: 1,
      backgroundColor: palette.border,
    },
    versusBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.primary,
      backgroundColor: palette.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: spacing(1),
    },
    versusText: {
      color: palette.primary,
      fontFamily: typography.fontFamily,
      fontSize: 14,
      fontWeight: typography.displayWeight,
      textTransform: typography.displayTransform,
    },
    oddTile: {
      alignSelf: 'stretch',
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.md,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 'auto',
    },
    oddTilePressed: {
      borderColor: palette.primary,
      backgroundColor: palette.background,
    },
    oddTileDisabled: { opacity: 0.55 },
    oddTileWinner: {
      borderColor: palette.success,
    },
    oddValue: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 22,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    oddLabel: {
      color: palette.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      marginTop: 2,
    },
    resultRow: {
      marginTop: spacing(1.75),
      backgroundColor: palette.surfaceAlt,
      borderRadius: radii.md,
      paddingVertical: spacing(1),
      paddingHorizontal: spacing(1.5),
    },
    resultText: {
      color: palette.success,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    resultTextDraw: { color: palette.info },
  })
}
