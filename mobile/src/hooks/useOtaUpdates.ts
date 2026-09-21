import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import type { AppStateStatus } from 'react-native'
import * as Updates from 'expo-updates'

/** Não checa mais de uma vez por minuto ao voltar do background. */
const CHECK_THROTTLE_MS = 60_000

export interface OtaStatus {
  /** false em Expo Go / dev client: a API completa só existe em build de release. */
  isEnabled: boolean
  isChecking: boolean
  isDownloading: boolean
  /** Bundle novo já baixado, aguardando reload. */
  isUpdatePending: boolean
  isUpdateAvailable: boolean
  channel: string | null
  runtimeVersion: string | null
  updateId: string | null
  isEmbeddedLaunch: boolean
  lastCheckedAt: Date | null
  error: string | null
  checkNow: () => Promise<void>
  applyUpdate: () => Promise<void>
}

/**
 * RF06 / RNF04 — rotina de EAS Update:
 * checa no boot e a cada retorno ao foreground, baixa em segundo plano e
 * deixa o reload sob comando da UI (banner).
 */
export function useOtaUpdates(): OtaStatus {
  const { currentlyRunning, isUpdateAvailable, isUpdatePending, isChecking, isDownloading } =
    Updates.useUpdates()

  const [error, setError] = useState<string | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const lastCheckRef = useRef(0)

  const checkNow = useCallback(async () => {
    // Em Expo Go / modo dev não há updates para buscar.
    if (!Updates.isEnabled) return

    const now = Date.now()
    if (now - lastCheckRef.current < CHECK_THROTTLE_MS) return
    lastCheckRef.current = now

    try {
      const result = await Updates.checkForUpdateAsync()
      setLastCheckedAt(new Date())
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync()
      }
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao checar atualização.')
    }
  }, [])

  // Boot.
  useEffect(() => {
    void checkNow()
  }, [checkNow])

  // Retorno ao foreground.
  useEffect(() => {
    const handleChange = (state: AppStateStatus): void => {
      if (state === 'active') void checkNow()
    }
    const subscription = AppState.addEventListener('change', handleChange)
    return () => subscription.remove()
  }, [checkNow])

  const applyUpdate = useCallback(async () => {
    try {
      await Updates.reloadAsync()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao aplicar atualização.')
    }
  }, [])

  return {
    isEnabled: Updates.isEnabled,
    isChecking,
    isDownloading,
    isUpdatePending,
    isUpdateAvailable,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    isEmbeddedLaunch: currentlyRunning.isEmbeddedLaunch,
    lastCheckedAt,
    error,
    checkNow,
    applyUpdate,
  }
}
