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

const FALLBACK_SEASON: SeasonKey = 'HUMAN_MMA'

interface ThemeContextValue {
  theme: AppTheme
  dictionary: ThemeDictionary
  season: SeasonDTO | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<SeasonDTO | null>(null)
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

  const activeKey: SeasonKey = season?.seasonType ?? FALLBACK_SEASON
  const theme = THEMES[activeKey]

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      dictionary: theme.dictionary,
      season,
      isLoading,
      error,
      refresh,
    }),
    [theme, season, isLoading, error, refresh],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useSeasonTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useSeasonTheme precisa estar dentro de <ThemeProvider>.')
  return context
}

export function useTheme(): AppTheme {
  return useSeasonTheme().theme
}

export function useDictionary(): ThemeDictionary {
  return useSeasonTheme().dictionary
}

export type { AppTheme, SeasonKey, ThemeDictionary }
