import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { SeasonDTO } from '../api/client'
import { mmaTheme } from './mmaTheme'
import { robotTheme } from './robotTheme'
import type { AppTheme, SeasonKey, ThemeDictionary } from './types'

export const THEMES: Record<SeasonKey, AppTheme> = {
  HUMAN_MMA: mmaTheme,
  ROBOT_ROOSTER: robotTheme,
}

/** Tema usado enquanto a API não responde. */
const FALLBACK_SEASON: SeasonKey = 'HUMAN_MMA'

interface ThemeContextValue {
  theme: AppTheme
  dictionary: ThemeDictionary
  season: SeasonDTO | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Alterna o tema localmente — usado para demonstrar a troca sazonal. */
  toggleSeasonPreview: () => void
  isPreviewing: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<SeasonDTO | null>(null)
  const [preview, setPreview] = useState<SeasonKey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getSeason()
      setSeason(data)
      setError(null)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Falha ao carregar a temporada.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const activeKey: SeasonKey = preview ?? season?.seasonType ?? FALLBACK_SEASON
  const theme = THEMES[activeKey]

  const toggleSeasonPreview = useCallback(() => {
    setPreview((current) => {
      const next: SeasonKey =
        (current ?? season?.seasonType ?? FALLBACK_SEASON) === 'HUMAN_MMA'
          ? 'ROBOT_ROOSTER'
          : 'HUMAN_MMA'
      // Voltar à temporada do servidor limpa o preview.
      return next === season?.seasonType ? null : next
    })
  }, [season?.seasonType])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      dictionary: theme.dictionary,
      season,
      isLoading,
      error,
      refresh,
      toggleSeasonPreview,
      isPreviewing: preview !== null,
    }),
    [theme, season, isLoading, error, refresh, toggleSeasonPreview, preview],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useSeasonTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useSeasonTheme precisa estar dentro de <ThemeProvider>.')
  return context
}

/** Atalho para quem só precisa da paleta/tipografia. */
export function useTheme(): AppTheme {
  return useSeasonTheme().theme
}

/** Atalho para os rótulos da temporada ativa. */
export function useDictionary(): ThemeDictionary {
  return useSeasonTheme().dictionary
}

export type { AppTheme, SeasonKey, ThemeDictionary }
