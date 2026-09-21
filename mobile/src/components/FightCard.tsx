import React, { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { CompetitorDTO, FightDTO } from '../api/client'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'

export interface FightCardProps {
  fight: FightDTO
  onPickWinner: (fight: FightDTO, competitor: CompetitorDTO, odd: number) => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/**
 * Card de luta 100% agnóstico: nomes de campos vêm do DTO e todos os
 * rótulos vêm do dicionário da temporada ativa.
 */
export function FightCard({ fight, onPickWinner }: FightCardProps) {
  const { theme, dictionary } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const renderCorner = (competitor: CompetitorDTO, odd: number, isWinner: boolean) => (
    <View style={styles.corner}>
      <Text style={[styles.name, isWinner && styles.nameWinner]} numberOfLines={2}>
        {competitor.name}
      </Text>
      <Text style={styles.team} numberOfLines={1}>
        {dictionary.team}: {competitor.team}
      </Text>
      <Text style={styles.spec} numberOfLines={1}>
        {dictionary.styleSpec}: {competitor.spec.style}
      </Text>
      <Text style={styles.record}>
        {dictionary.record} {competitor.record.summary}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${dictionary.betAction} em ${competitor.name}, odd ${odd.toFixed(2)}`}
        disabled={fight.isFinished}
        onPress={() => onPickWinner(fight, competitor, odd)}
        style={({ pressed }) => [
          styles.oddButton,
          pressed && styles.oddButtonPressed,
          fight.isFinished && styles.oddButtonDisabled,
        ]}
      >
        <Text style={styles.oddValue}>{odd.toFixed(2)}</Text>
        <Text style={styles.oddLabel}>{dictionary.betAction}</Text>
      </Pressable>
    </View>
  )

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.weight} numberOfLines={1}>
          {fight.competitorA.spec.weight}
        </Text>
        <Text style={styles.date}>
          {fight.isFinished ? dictionary.finished : formatDate(fight.scheduledAt)}
        </Text>
      </View>

      <View style={styles.body}>
        {renderCorner(fight.competitorA, fight.odds.a, fight.winnerId === fight.competitorA.id)}
        <View style={styles.versusWrapper}>
          <Text style={styles.versus}>{dictionary.versus}</Text>
        </View>
        {renderCorner(fight.competitorB, fight.odds.b, fight.winnerId === fight.competitorB.id)}
      </View>

      {fight.isFinished ? (
        <Text style={styles.result}>
          {fight.isDraw
            ? dictionary.draw
            : `${dictionary.winner}: ${
                fight.winnerId === fight.competitorA.id
                  ? fight.competitorA.name
                  : fight.competitorB.name
              }`}
        </Text>
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
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing(1.5),
    },
    weight: {
      flex: 1,
      color: palette.accent,
      fontFamily: typography.fontFamily,
      fontSize: 12,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    date: {
      color: palette.textMuted,
      fontFamily: typography.numericFontFamily,
      fontSize: 12,
      textTransform: 'uppercase',
    },
    body: { flexDirection: 'row', alignItems: 'stretch' },
    corner: { flex: 1 },
    versusWrapper: { justifyContent: 'center', paddingHorizontal: spacing(1) },
    versus: {
      color: palette.primary,
      fontFamily: typography.fontFamily,
      fontSize: 16,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
    },
    name: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 16,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing * 0.5,
      textTransform: typography.displayTransform,
      minHeight: 42,
    },
    nameWinner: { color: palette.success },
    team: { color: palette.textMuted, fontSize: 12, marginTop: spacing(0.5) },
    spec: { color: palette.textMuted, fontSize: 12 },
    record: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 12,
      marginTop: spacing(0.5),
    },
    oddButton: {
      marginTop: spacing(1.5),
      backgroundColor: palette.primary,
      borderRadius: radii.md,
      paddingVertical: spacing(1),
      alignItems: 'center',
    },
    oddButtonPressed: { opacity: 0.75 },
    oddButtonDisabled: { backgroundColor: palette.surfaceAlt },
    oddValue: {
      color: palette.primaryContrast,
      fontFamily: typography.numericFontFamily,
      fontSize: 20,
      fontWeight: '700',
    },
    oddLabel: {
      color: palette.primaryContrast,
      fontFamily: typography.fontFamily,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    result: {
      marginTop: spacing(1.5),
      color: palette.textMuted,
      fontFamily: typography.fontFamily,
      fontSize: 12,
      textTransform: typography.displayTransform,
      letterSpacing: typography.displayLetterSpacing * 0.5,
    },
  })
}
