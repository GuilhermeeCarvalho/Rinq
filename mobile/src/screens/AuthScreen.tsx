import React, { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { api, ApiError, setAuthToken } from '../api/client'

interface AuthScreenProps {
  onAuthenticated: (token: string) => void
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(): Promise<void> {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = isRegistering
        ? await api.register({ name, email, password })
        : await api.login({ email, password })
      setAuthToken(response.token)
      onAuthenticated(response.token)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível autenticar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>RINQ</Text>
      <Text style={styles.title}>{isRegistering ? 'Criar conta' : 'Entrar'}</Text>
      {isRegistering ? <TextInput placeholder="Nome" value={name} onChangeText={setName} style={styles.input} /> : null}
      <TextInput autoCapitalize="none" placeholder="E-mail" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
      <TextInput placeholder="Senha" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={isSubmitting} onPress={() => void submit()} style={styles.button}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isRegistering ? 'Cadastrar' : 'Entrar'}</Text>}
      </Pressable>
      <Pressable onPress={() => setIsRegistering((value) => !value)}>
        <Text style={styles.link}>{isRegistering ? 'Já tenho uma conta' : 'Criar uma conta'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0B0B0D' },
  logo: { color: '#F04D3D', fontSize: 42, fontWeight: '900', letterSpacing: 4, marginBottom: 12 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '700', marginBottom: 24 },
  input: { backgroundColor: '#1B1B20', borderRadius: 8, color: '#FFF', marginBottom: 12, padding: 14 },
  button: { alignItems: 'center', backgroundColor: '#F04D3D', borderRadius: 8, marginTop: 8, padding: 15 },
  buttonText: { color: '#FFF', fontWeight: '700' },
  error: { color: '#FF8B80', marginBottom: 8 },
  link: { color: '#F58C80', marginTop: 20, textAlign: 'center' },
})