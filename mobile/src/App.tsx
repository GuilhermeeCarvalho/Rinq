import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider, useTheme } from './theme'
import { MainNavigator } from './screens/MainNavigator'
import { AuthScreen } from './screens/AuthScreen'
import { api, setAuthToken } from './api/client'
import { clearSessionToken, getSessionToken, setSessionToken } from './lib/sessionStorage'

function ThemedStatusBar() {
  const theme = useTheme()
  return <StatusBar style={theme.statusBarStyle} />
}

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    void getSessionToken().then(async (storedToken) => {
      if (!storedToken) {
        setIsHydrated(true)
        return
      }
      setAuthToken(storedToken)
      try {
        await api.getMe()
        setToken(storedToken)
      } catch {
        setAuthToken(null)
        await clearSessionToken()
      } finally {
        setIsHydrated(true)
      }
    })
  }, [])

  async function handleAuthenticated(nextToken: string): Promise<void> {
    await setSessionToken(nextToken)
    setToken(nextToken)
  }

  async function handleLogout(): Promise<void> {
    setAuthToken(null)
    await clearSessionToken()
    setToken(null)
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        {isHydrated ? (
          token ? (
            <MainNavigator onLogout={() => void handleLogout()} />
          ) : (
            <AuthScreen onAuthenticated={(value) => void handleAuthenticated(value)} />
          )
        ) : null}
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
