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
      backgroundColor: palette.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      borderRadius: radii.sm,
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(1),
      marginBottom: spacing(2),
    },
    text: {
      flex: 1,
      color: palette.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
    },
    action: {
      paddingHorizontal: spacing(1),
      paddingVertical: spacing(0.5),
    },
    actionText: {
      color: palette.primary,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  })
}
