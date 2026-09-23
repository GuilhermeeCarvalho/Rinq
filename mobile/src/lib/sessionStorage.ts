import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'rinq.authToken'

export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage.getItem(TOKEN_KEY)
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setSessionToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage.setItem(TOKEN_KEY, token)
    return
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage.removeItem(TOKEN_KEY)
    return
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}