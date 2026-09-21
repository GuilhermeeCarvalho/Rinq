import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { CompetitorDTO, FightDTO } from '../api/client'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'

const QUICK_AMOUNTS = [25, 50, 100, 250]

export interface BetSelection {
  fight: FightDTO
  competitor: CompetitorDTO
  odd: number
}

export interface BetSheetProps {
  selection: BetSelection | null
  balance: number
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (amount: number) => void
}

/** RF05 — seleção do valor e projeção do retorno antes de confirmar. */
export function BetSheet({
  selection,
  balance,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: BetSheetProps) {
  const { theme, dictionary } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [amountText, setAmountText] = useState('50')

  const amount = Number.parseInt(amountText, 10)
  const isValidAmount = Number.isInteger(amount) && amount > 0 && amount <= balance
  const potentialPayout = isValidAmount ? amount * (selection?.odd ?? 0) : 0

  return (
    <Modal
      visible={selection !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{dictionary.betSheetTitle}</Text>

          {selection ? (
            <>
              <Text style={styles.competitor}>{selection.competitor.name}</Text>
              <Text style={styles.meta}>
                {dictionary.team}: {selection.competitor.team} · odd{' '}
                {selection.odd.toFixed(2)}
              </Text>

              <Text style={styles.label}>{dictionary.betAmountLabel}</Text>
              <TextInput
                value={amountText}
                onChangeText={(text) => setAmountText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.input}
                placeholder="0"
                placeholderTextColor={theme.palette.textMuted}
                editable={!isSubmitting}
              />

              <View style={styles.chips}>
                {QUICK_AMOUNTS.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setAmountText(String(value))}
                    disabled={isSubmitting || value > balance}
                    style={({ pressed }) => [
                      styles.chip,
                      pressed && styles.chipPressed,
                      value > balance && styles.chipDisabled,
                    ]}
                  >
                    <Text style={styles.chipText}>{value}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{dictionary.potentialReturn}</Text>
                <Text style={styles.summaryValue}>{potentialPayout.toFixed(2)}</Text>
              </View>
              <Text style={styles.balance}>
                {dictionary.balance}: {balance} {dictionary.balanceShort}
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                disabled={!isValidAmount || isSubmitting}
                onPress={() => onConfirm(amount)}
                style={({ pressed }) => [
                  styles.confirm,
                  pressed && styles.confirmPressed,
                  (!isValidAmount || isSubmitting) && styles.confirmDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.palette.primaryContrast} />
                ) : (
                  <Text style={styles.confirmText}>{dictionary.confirmBet}</Text>
                )}
              </Pressable>

              <Pressable onPress={onClose} disabled={isSubmitting} style={styles.cancel}>
                <Text style={styles.cancelText}>{dictionary.cancel}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

function createStyles(theme: AppTheme) {
  const { palette, typography, radii, spacing } = theme

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: palette.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: palette.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      borderTopWidth: 1,
      borderColor: palette.border,
      padding: spacing(3),
      paddingBottom: spacing(5),
    },
    title: {
      color: palette.primary,
      fontFamily: typography.fontFamily,
      fontSize: 14,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    competitor: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 22,
      fontWeight: typography.displayWeight,
      marginTop: spacing(1),
    },
    meta: { color: palette.textMuted, fontSize: 12, marginTop: spacing(0.5) },
    label: {
      color: palette.textMuted,
      fontSize: 11,
      letterSpacing: 1,
      marginTop: spacing(2.5),
      textTransform: 'uppercase',
    },
    input: {
      marginTop: spacing(1),
      backgroundColor: palette.surfaceAlt,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 24,
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(1.5),
    },
    chips: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.5) },
    chip: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: palette.surfaceAlt,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: palette.border,
      paddingVertical: spacing(1),
    },
    chipPressed: { opacity: 0.7 },
    chipDisabled: { opacity: 0.35 },
    chipText: {
      color: palette.text,
      fontFamily: typography.numericFontFamily,
      fontSize: 14,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing(2.5),
    },
    summaryLabel: {
      color: palette.textMuted,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    summaryValue: {
      color: palette.accent,
      fontFamily: typography.numericFontFamily,
      fontSize: 24,
      fontWeight: '700',
    },
    balance: { color: palette.textMuted, fontSize: 12, marginTop: spacing(0.5) },
    error: { color: palette.danger, fontSize: 13, marginTop: spacing(1.5) },
    confirm: {
      marginTop: spacing(2.5),
      backgroundColor: palette.primary,
      borderRadius: radii.md,
      paddingVertical: spacing(2),
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    confirmPressed: { opacity: 0.8 },
    confirmDisabled: { backgroundColor: palette.surfaceAlt },
    confirmText: {
      color: palette.primaryContrast,
      fontFamily: typography.fontFamily,
      fontSize: 15,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    cancel: { alignItems: 'center', marginTop: spacing(1.5) },
    cancelText: { color: palette.textMuted, fontSize: 13, textTransform: 'uppercase' },
  })
}
