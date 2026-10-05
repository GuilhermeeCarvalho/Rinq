import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { api, ApiError, setAuthToken } from '../api/client'
import { useSeasonTheme } from '../theme'
import type { AppTheme } from '../theme/types'

interface AuthScreenProps {
  onAuthenticated: (token: string) => void
}

const LOGO_WIDTH = 220

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const { theme } = useSeasonTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [isRegistering, setIsRegistering] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('demo@rinq.app')
  const [password, setPassword] = useState('player123')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  async function submit(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setError('Preencha seu e-mail e sua senha.')
      return
    }
    if (isRegistering && !name.trim()) {
      setError('Informe seu nome ou apelido de apostador.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const response = isRegistering
        ? await api.register({ name: name.trim(), email: normalizedEmail, password })
        : await api.login({ email: normalizedEmail, password })
      setAuthToken(response.token)
      onAuthenticated(response.token)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível autenticar. Verifique sua conexão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function setQuickAccount(fillEmail: string) {
    setEmail(fillEmail)
    setPassword('player123')
    setError(null)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          <Image
            source={theme.logo}
            accessibilityLabel={`${theme.dictionary.brandMain} ${theme.dictionary.brandSub}`}
            resizeMode="contain"
            style={[styles.brandLogo, { width: LOGO_WIDTH, height: LOGO_WIDTH / theme.logoAspectRatio }]}
          />
          <Text style={styles.brandSeason}>{theme.dictionary.seasonBadge}</Text>
          <View style={styles.brandRule} />

          <Text style={styles.brandTitle}>
            {isRegistering ? 'Crie sua carteira' : 'Entre no ringue'}
          </Text>
          <Text style={styles.brandSubtitle}>
            {isRegistering
              ? 'Abra sua conta e receba 1.500 moedas fictícias para dar seus palpites.'
              : 'Acompanhe as odds e gerencie seus bilhetes de aposta.'}
          </Text>
        </View>

        <View style={styles.tabSwitcher}>
          <Pressable
            onPress={() => {
              setIsRegistering(false)
              setError(null)
            }}
            style={[styles.tabButton, !isRegistering && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, !isRegistering && styles.tabTextActive]}>
              Entrar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setIsRegistering(true)
              setError(null)
            }}
            style={[styles.tabButton, isRegistering && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, isRegistering && styles.tabTextActive]}>
              Criar conta
            </Text>
          </Pressable>
        </View>

        <View style={styles.formCard}>
          {isRegistering ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome ou apelido</Text>
              <TextInput
                placeholder="Ex: Carlos Silva"
                placeholderTextColor={theme.palette.textMuted}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                style={[styles.input, focusedInput === 'name' && styles.inputFocused]}
              />
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>E-mail</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="seu-email@rinq.app"
              placeholderTextColor={theme.palette.textMuted}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              style={[styles.input, focusedInput === 'email' && styles.inputFocused]}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.inputLabel}>Senha</Text>
              <Pressable onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.toggleShowPassword}>
                  {showPassword ? 'Ocultar' : 'Exibir'}
                </Text>
              </Pressable>
            </View>
            <TextInput
              secureTextEntry={!showPassword}
              placeholder="Mínimo de 8 caracteres"
              placeholderTextColor={theme.palette.textMuted}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              style={[styles.input, focusedInput === 'password' && styles.inputFocused]}
            />
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={isSubmitting}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.palette.primaryContrast} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isRegistering ? 'Criar conta' : 'Entrar'}
              </Text>
            )}
          </Pressable>

          {!isRegistering ? (
            <View style={styles.demoSection}>
              <Pressable
                onPress={() => setQuickAccount('demo@rinq.app')}
                style={[styles.demoChip, email === 'demo@rinq.app' && styles.demoChipActive]}
              >
                <Text style={styles.demoChipText}>Usar conta de demonstração</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.footerDisclaimer}>
          <Text style={styles.disclaimerText}>
            O Rinq utiliza moeda virtual fictícia. Não há premiações em dinheiro real,
            depósitos ou saques.
          </Text>
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
    scrollContent: {
      paddingHorizontal: spacing(3),
      paddingTop: Platform.OS === 'ios' ? 72 : 48,
      paddingBottom: spacing(5),
    },
    brandHeader: { marginBottom: spacing(3) },
    brandLogo: { marginLeft: -4 },
    brandSeason: { color: palette.textMuted, fontFamily: body, fontSize: 13, marginTop: 2 },
    brandRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
      marginVertical: spacing(3),
    },
    brandTitle: {
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: 24,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
      marginBottom: spacing(0.75),
    },
    brandSubtitle: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 15,
      lineHeight: 21,
    },
    tabSwitcher: {
      flexDirection: 'row',
      gap: spacing(3),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
      marginBottom: spacing(2.5),
    },
    tabButton: {
      paddingVertical: spacing(1.25),
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      marginBottom: -StyleSheet.hairlineWidth,
    },
    tabButtonActive: {
      borderBottomColor: palette.primary,
    },
    tabText: { color: palette.textMuted, fontFamily: body, fontSize: 15 },
    tabTextActive: { color: palette.text, fontWeight: '600' },
    formCard: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radii.lg,
      padding: spacing(2.5),
    },
    inputGroup: { marginBottom: spacing(2) },
    passwordLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    inputLabel: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 13,
      marginBottom: 6,
    },
    toggleShowPassword: {
      color: palette.accent,
      fontFamily: body,
      fontSize: 13,
      textDecorationLine: 'underline',
    },
    input: {
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text,
      borderRadius: radii.md,
      paddingHorizontal: spacing(1.5),
      paddingVertical: spacing(1.5),
      fontFamily: body,
      fontSize: 16,
    },
    inputFocused: {
      borderColor: palette.primary,
    },
    errorBanner: {
      borderLeftWidth: 2,
      borderLeftColor: palette.danger,
      paddingLeft: spacing(1.25),
      paddingVertical: spacing(0.5),
      marginBottom: spacing(2),
    },
    errorText: { color: palette.danger, fontFamily: body, fontSize: 14, lineHeight: 19 },
    submitButton: {
      backgroundColor: palette.primary,
      borderRadius: radii.md,
      paddingVertical: spacing(1.75),
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      marginTop: spacing(0.5),
    },
    submitButtonText: {
      color: palette.primaryContrast,
      fontFamily: typography.fontFamily,
      fontSize: 17,
      fontWeight: typography.displayWeight,
      letterSpacing: typography.displayLetterSpacing,
      textTransform: typography.displayTransform,
    },
    buttonPressed: { opacity: 0.85 },
    buttonDisabled: { opacity: 0.5 },
    demoSection: {
      marginTop: spacing(2),
      alignItems: 'center',
    },
    demoChip: {
      paddingVertical: spacing(0.75),
    },
    demoChipActive: {},
    demoChipText: {
      color: palette.textMuted,
      fontFamily: body,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
    footerDisclaimer: {
      marginTop: spacing(5),
      paddingTop: spacing(2),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
    },
    disclaimerText: { color: palette.textMuted, fontFamily: body, fontSize: 12, lineHeight: 18 },
  })
}
