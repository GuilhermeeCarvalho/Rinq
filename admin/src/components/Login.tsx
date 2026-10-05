import { useState, type FormEvent } from 'react'
import { Activity, ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { request, tokenKey } from '../services/api'
import type { AuthResponse, Season } from '../types'
import { THEMES } from '../theme'

export function Login({
  season,
  onLogin,
}: {
  season: Season
  onLogin: (response: AuthResponse) => void
}) {
  const [email, setEmail] = useState('admin@rinq.app')
  const [password, setPassword] = useState('admin12345')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setError('Informe seu e-mail e sua senha.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      if (result.user.role !== 'ADMIN')
        throw new Error('Esta área é exclusiva para administradores.')
      localStorage.setItem(tokenKey, result.token)
      onLogin(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha no login.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <main className="login-shell">
      <div className="login-art">
        <img className="brand-logo" src={THEMES[season].logo} alt={THEMES[season].name} />
        <div>
          <p className="eyebrow">RINQ / OPERATIONS</p>
          <h1>
            O ringue por
            <br />
            <em>trás do show.</em>
          </h1>
        </div>
        <div className="login-signal">
          <Activity size={16} /> SISTEMA ONLINE <span>●</span> API 3333
        </div>
      </div>
      <form className="login-form" onSubmit={submit}>
        <div>
          <p className="eyebrow">Acesso restrito</p>
          <h2>Entrar no painel</h2>
          <p className="muted">Use suas credenciais administrativas para continuar.</p>
        </div>
        <label>
          E-mail
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Senha
          <span className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ocultar senha' : 'Revelar senha'}
              title={showPassword ? 'Ocultar senha' : 'Revelar senha'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="button button-primary button-wide" disabled={loading}>
          {loading ? (
            'Autenticando...'
          ) : (
            <>
              Acessar operações <ArrowUpRight size={17} />
            </>
          )}
        </button>
      </form>
    </main>
  )
}
