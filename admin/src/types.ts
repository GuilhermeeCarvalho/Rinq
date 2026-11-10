export type Role = 'PLAYER' | 'ADMIN'
export type Season = 'HUMAN_MMA' | 'ROBOT_ROOSTER'
export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'VOID'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  virtualCoins: number
  createdAt: string
  totalBets?: number
}

export interface Competitor {
  id: string
  recordAvailable?: boolean
  name: string
  team: string
  seasonType: Season
  spec: { weight: string; style: string }
  record: { wins: number; losses: number; draws: number; total: number; summary: string }
}

export interface Fight {
  id: string
  bettingOpen?: boolean
  seasonType: Season
  scheduledAt: string
  isFinished: boolean
  finishedAt: string | null
  winnerId: string | null
  competitorA: Competitor
  competitorB: Competitor
  odds: { a: number; b: number }
}

export interface Bet {
  id: string
  amount: number
  oddAtPlacement: number
  potentialPayout: number
  status: BetStatus
  createdAt: string
  chosenWinner: Competitor
  fight: Fight
}

export interface AuthResponse {
  token: string
  user: User
}
