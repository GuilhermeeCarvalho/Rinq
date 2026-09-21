import React, { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'
import type { OtaStatus } from '../hooks/useOtaUpdates'

/** RNF04 — feedback visível do ciclo de EAS Update. */
export function UpdateBanner({ ota }: { ota: OtaStatus }) {
  const { theme, dictionary } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (!ota.isEnabled) return null
  if (!ota.isUpdatePending && !ota.isDownloading) return null

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {ota.isUpdatePending ? dictionary.updateAvailable : dictionary.updateApplying}
      </Text>
      {ota.isUpdatePending ? (
        <Pressable onPress={() => void ota.applyUpdate()} style={styles.action}>
          <Text style={styles.actionText}>Aplicar</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function createStyles(theme: AppTheme) {
  const { palette, typography, radii, spacing } = theme

  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.accent,
      borderRadius: radii.md,
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(1.25),
      marginBottom: spacing(2),
    },
    text: {
      flex: 1,
      color: '#0B0B0D',
      fontFamily: typography.fontFamily,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: typography.displayTransform,
    },
    action: {
      backgroundColor: '#0B0B0D',
      borderRadius: radii.pill,
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(0.75),
    },
    actionText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
  })
}
