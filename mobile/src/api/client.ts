import Constants from 'expo-constants'
import type { SeasonKey } from '../theme/types'

/* ------------------------------------------------------------------ DTOs
 * Espelham exatamente as Views do backend (src/views/*.ts).
 */
export interface CompetitorDTO {
  id: string
  name: string
  team: string
  seasonType: SeasonKey
  spec: { weight: string; style: string }
  record: { wins: number; losses: number; draws: number; total: number; summary: string }
}

export interface FightDTO {
  id: string
  seasonType: SeasonKey
  scheduledAt: string
  isFinished: boolean
  finishedAt: string | null
  winnerId: string | null
  isDraw: boolean
  competitorA: CompetitorDTO
  competitorB: CompetitorDTO
  odds: { a: number; b: number; houseMargin: number; impliedMargin: number }
}

export interface SeasonDTO {
  seasonType: SeasonKey
  label: string
  endsAt: string | null
  easChannel: string | null
  serverTime: string
}

export interface UserDTO {
  id: string
  name: string
  email: string
  role: 'PLAYER' | 'ADMIN'
  virtualCoins: number
  createdAt: string
}

export interface BetDTO {
  id: string
  amount: number
  oddAtPlacement: number
  potentialPayout: number
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID'
  createdAt: string
  settledAt: string | null
  chosenWinner: CompetitorDTO
  fight: FightDTO
}

export interface PlaceBetResponse {
  bet: BetDTO
  balance: number
}

export interface AuthResponse {
  token: string
  user: UserDTO
}

/* ------------------------------------------------------------------ setup */

const DEFAULT_PORT = 3333
const REQUEST_TIMEOUT_MS = 10_000

/**
 * Resolve a URL da API sem exigir configuração manual:
 *   1. EXPO_PUBLIC_API_URL (env)
 *   2. expo.extra.apiUrl (app.json)
 *   3. IP do Metro (hostUri) — funciona em device físico e emulador
 *   4. localhost
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env['EXPO_PUBLIC_API_URL']
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const fromConfig = Constants.expoConfig?.extra?.['apiUrl']
  if (typeof fromConfig === 'string' && fromConfig.length > 0) return fromConfig.replace(/\/$/, '')

  const hostUri = Constants.expoConfig?.hostUri
  const devHost = hostUri?.split(':')[0]
  if (devHost) return `http://${devHost}:${DEFAULT_PORT}`

  return `http://localhost:${DEFAULT_PORT}`
}

export const API_BASE_URL = resolveBaseUrl()
let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    })

    const raw = await response.text()
    const payload = raw.length > 0 ? (JSON.parse(raw) as unknown) : null

    if (!response.ok) {
      const envelope = payload as ErrorEnvelope | null
      throw new ApiError(
        envelope?.error?.code ?? 'HTTP_ERROR',
        envelope?.error?.message ?? `Falha na requisição (${response.status}).`,
        response.status,
      )
    }

    return payload as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'A API não respondeu em tempo. O backend está rodando?', 408)
    }
    throw new ApiError(
      'NETWORK_ERROR',
      `Não foi possível falar com a API em ${API_BASE_URL}. Verifique o backend.`,
      0,
    )
  } finally {
    clearTimeout(timeout)
  }
}

/* ------------------------------------------------------------------ rotas */

export const api = {
  /** RF06 — temporada ativa que define tema e dicionário. */
  getSeason: () => request<SeasonDTO>('/season'),

  /** RF03 — card de lutas da temporada. */
  getFights: (season?: SeasonKey) =>
    request<{ seasonType: SeasonKey; total: number; fights: FightDTO[] }>(
      season ? `/fights?season=${season}` : '/fights',
    ),

  /** RF02 — catálogo de competidores. */
  getCompetitors: (season?: SeasonKey) =>
    request<{ seasonType: SeasonKey; total: number; competitors: CompetitorDTO[] }>(
      season ? `/competitors?season=${season}` : '/competitors',
    ),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),

  register: (input: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),

  getMe: () => request<UserDTO>('/auth/me'),

  /** RF05 — efetivação da aposta. */
  placeBet: (input: { fightId: string; chosenWinnerId: string; amount: number }) =>
    request<PlaceBetResponse>('/bets', { method: 'POST', body: JSON.stringify(input) }),

  getUserBets: (userId: string) =>
    request<{ total: number; bets: BetDTO[] }>(`/users/${userId}/bets`),
}
