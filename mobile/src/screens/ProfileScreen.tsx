import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { api, ApiError } from '../api/client'
import type { BetDTO, UserDTO } from '../api/client'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'

type Feedback = { kind: 'success' | 'error'; message: string } | null

export function ProfileScreen() {
  const { theme, dictionary } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [user, setUser] = useState<UserDTO | null>(null)
  const [bets, setBets] = useState<BetDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const loadProfile = useCallback(async () => {
    try {
      const [me, myBets] = await Promise.all([api.getMe(), api.getMyBets()])
      setUser(me)
      setBets(myBets.bets)
      setName(me.name)
      setEmail(me.email)
      setLoadError(null)
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : 'Falha ao carregar seu perfil.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void loadProfile().finally(() => {
      if (mounted) setIsLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [loadProfile])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadProfile()
    setIsRefreshing(false)
  }, [loadProfile])

  const stats = useMemo(() => {
    const won = bets.filter((b) => b.status === 'WON').length
    const lost = bets.filter((b) => b.status === 'LOST').length
    const settled = won + lost
    return {
      total: bets.length,
      won,
      winRate: settled > 0 ? Math.round((won / settled) * 100) : 0,
    }
  }, [bets])

  const trimmedName = name.trim()
  const trimmedEmail = email.trim().toLowerCase()
  const nameChanged = user !== null && trimmedName !== user.name
  const emailChanged = user !== null && trimmedEmail !== user.email
  const passwordChanged = newPassword.length > 0
  const needsCurrentPassword = emailChanged || passwordChanged
  const hasChanges = nameChanged || emailChanged || passwordChanged

  async function handleSave() {
    if (!hasChanges) return
    if (needsCurrentPassword && currentPassword.length === 0) {
      setFeedback({ kind: 'error', message: 'Informe a senha atual para alterar e-mail ou senha.' })
      return
    }

    setIsSaving(true)
    setFeedback(null)
    try {
      const updated = await api.updateMe({
        ...(nameChanged ? { name: trimmedName } : {}),
        ...(emailChanged ? { email: trimmedEmail } : {}),
        ...(passwordChanged ? { newPassword } : {}),
        ...(needsCurrentPassword ? { currentPassword } : {}),
      })
      setUser(updated)
      setName(updated.name)
      setEmail(updated.email)
      setCurrentPassword('')
      setNewPassword('')
      setFeedback({ kind: 'success', message: 'Perfil atualizado com sucesso!' })
    } catch (cause) {
      setFeedback({
        kind: 'error',
        message: cause instanceof ApiError ? cause.message : 'Não foi possível salvar o perfil.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleDiscard() {
    if (!user) return
    setName(user.name)
    setEmail(user.email)
    setCurrentPassword('')
    setNewPassword('')
    setFeedback(null)
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={theme.palette.primary} size="large" />
        <Text style={styles.mutedText}>Carregando seu perfil...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{loadError ?? 'Perfil indisponível.'}</Text>
        <Pressable
          onPress={() => void handleRefresh()}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    )
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={theme.palette.primary}
          />
        }
      >
        <Text style={styles.screenTitle}>{dictionary.tabProfile}</Text>
        <Text style={styles.screenSubtitle}>Seus dados, carteira e histórico de palpites</Text>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.identityName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.identityEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <Text style={styles.identityMeta}>Membro desde {memberSince}</Text>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{dictionary.balance}</Text>
            <Text style={[styles.summaryValue, styles.summaryValueGold]}>
              {user.virtualCoins.toLocaleString('pt-BR')}
            </Text>
          </View>
          <View style={[styles.summaryCol, styles.summaryColDivided]}>
            <Text style={styles.summaryLabel}>Apostas</Text>
            <Text style={styles.summaryValue}>{stats.total}</Text>
          </View>
          <View style={[styles.summaryCol, styles.summaryColDivided]}>
            <Text style={styles.summaryLabel}>Acerto</Text>
            <Text style={[styles.summaryValue, styles.summaryValueGreen]}>{stats.winRate}%</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Dados da conta</Text>

          <Text style={styles.inputLabel}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={theme.palette.textMuted}
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.inputLabel}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor={theme.palette.textMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <View style={styles.formDivider} />
          <Text style={styles.sectionTitle}>Alterar senha</Text>

          <Text style={styles.inputLabel}>Nova senha</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Mínimo de 8 caracteres"
            placeholderTextColor={theme.palette.textMuted}
            style={styles.input}
            secureTextEntry
          />

          {needsCurrentPassword ? (
            <>
              <Text style={styles.inputLabel}>Senha atual</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Confirme com sua senha atual"
                placeholderTextColor={theme.palette.textMuted}
                style={styles.input}
                secureTextEntry
              />
            </>
          ) : null}

          {feedback ? (
            <View
              style={[
                styles.feedbackBox,
                feedback.kind === 'success' ? styles.feedbackSuccess : styles.feedbackError,
              ]}
            >
              <Text
                style={[
                  styles.feedbackText,
                  { color: feedback.kind === 'success' ? theme.palette.success : theme.palette.danger },
                ]}
              >
                {feedback.message}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!hasChanges || isSaving}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.primaryButton,
              (!hasChanges || isSaving) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.palette.primaryContrast} />
            ) : (
              <Text style={styles.primaryButtonText}>Salvar alterações</Text>
            )}
          </Pressable>

          {hasChanges && !isSaving ? (
            <Pressable
              onPress={handleDiscard}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Descartar</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function createStyles(theme: AppTheme) {
  const { palette, typography, radii, spacing } = theme
  const body = typography.bodyFontFamily

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: spacing(2), paddingTop: spacing(1.5), paddingBottom: spacing(6) },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing(2),
      backgroundColor: palette.background,
      padding: spacing(3),
    },
    mutedText: { color: palette.textMuted, fontFamily: body, fontSize: 14 },
    errorText: { color: palette.danger, fontFamily: body, fontSize: 14, textAlign: 'center' },
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
      marginBottom: spacing(2.5),
    },
    identityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(1.5),
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.lg,
      padding: spacing(2),
      marginBottom: spacing(1.5),
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: palette.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: palette.primaryContrast,
      fontFamily: typography.fontFamily,
      fontSize: 19,
      fontWeight: typography.displayWeight,
    },
    identityInfo: { flex: 1 },
    identityName: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 19,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    identityEmail: { color: palette.textMuted, fontFamily: body, fontSize: 14, marginTop: 2 },
    identityMeta: { color: palette.accent, fontFamily: body, fontSize: 12, marginTop: 4 },
    summaryContainer: { flexDirection: 'row', gap: spacing(1), marginBottom: spacing(2) },
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
    formCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.lg,
      padding: spacing(2),
    },
    sectionTitle: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 17,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
      marginBottom: spacing(0.5),
    },
    inputLabel: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 13,
      marginBottom: 6,
      marginTop: spacing(1.5),
    },
    input: {
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.sm,
      color: palette.text,
      fontFamily: body,
      fontSize: 15,
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(1.25),
    },
    formDivider: {
      height: 1,
      backgroundColor: palette.border,
      marginTop: spacing(3),
      marginBottom: spacing(2),
    },
    feedbackBox: {
      borderLeftWidth: 2,
      paddingLeft: spacing(1.25),
      paddingVertical: spacing(0.5),
      marginTop: spacing(2),
    },
    feedbackSuccess: { borderLeftColor: palette.success },
    feedbackError: { borderLeftColor: palette.danger },
    feedbackText: { fontFamily: body, fontSize: 14 },
    primaryButton: {
      backgroundColor: palette.primary,
      borderRadius: radii.md,
      paddingVertical: spacing(1.75),
      alignItems: 'center',
      marginTop: spacing(3),
    },
    primaryButtonText: {
      color: palette.primaryContrast,
      fontFamily: typography.fontFamily,
      fontSize: 16,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    secondaryButton: {
      paddingVertical: spacing(1),
      paddingHorizontal: spacing(2),
      alignItems: 'center',
      marginTop: spacing(1),
    },
    secondaryButtonText: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
    buttonDisabled: { opacity: 0.4 },
    pressed: { opacity: 0.7 },
  })
}
