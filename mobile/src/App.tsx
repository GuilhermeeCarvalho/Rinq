import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider, useTheme } from './theme'
import { HomeScreen } from './screens/HomeScreen'

/** A StatusBar precisa estar dentro do provider para seguir o tema sazonal. */
function ThemedStatusBar() {
  const theme = useTheme()
  return <StatusBar style={theme.statusBarStyle} />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <HomeScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
