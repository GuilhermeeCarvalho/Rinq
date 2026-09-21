import type { BetStatus } from '../../generated/prisma/enums.js'
import type { BetWithRelations, SettlementSummary } from '../models/BetModel.js'
import { CompetitorView } from './CompetitorView.js'
import type { CompetitorDTO } from './CompetitorView.js'
import { FightView } from './FightView.js'
import type { FightDTO } from './FightView.js'

export interface BetDTO {
  id: string
  amount: number
  oddAtPlacement: number
  potentialPayout: number
  status: BetStatus
  createdAt: string
  settledAt: string | null
  chosenWinner: CompetitorDTO
  fight: FightDTO
}

/** RF05 — DTO do bilhete de aposta. */
export class BetView {
  static render(bet: BetWithRelations): BetDTO {
    return {
      id: bet.id,
      amount: bet.amount,
      oddAtPlacement: bet.oddAtPlacement,
      potentialPayout: bet.potentialPayout,
      status: bet.status,
      createdAt: bet.createdAt.toISOString(),
      settledAt: bet.settledAt?.toISOString() ?? null,
      chosenWinner: CompetitorView.render(bet.chosenWinner),
      fight: FightView.render(bet.fight),
    }
  }

  static renderMany(bets: BetWithRelations[]): BetDTO[] {
    return bets.map(BetView.render)
  }

  /** Resposta de POST /bets: bilhete + saldo já atualizado. */
  static renderPlacement(bet: BetWithRelations, balance: number) {
    return {
      bet: BetView.render(bet),
      balance,
    }
  }

  static renderSettlement(summary: SettlementSummary) {
    return {
      betsWon: summary.won,
      betsLost: summary.lost,
      betsVoided: summary.voided,
      coinsPaid: summary.coinsPaid,
    }
  }
}
