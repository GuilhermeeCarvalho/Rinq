import { mmaTicketSchema } from '../lib/mmaTicket.js'
import { HOUSE_MARGIN, OddsService } from '../services/OddsService.js'
import { SeasonType, type BetStatus } from '../../generated/prisma/enums.js'
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

function renderMmaTicket(bet: BetWithRelations) {
  const ticket = mmaTicketSchema.parse(bet.mmaTicket)
  const toCompetitor = (fighter: typeof ticket.competitorA) => CompetitorView.render({
    ...fighter,
    seasonType: SeasonType.HUMAN_MMA,
    team: '—',
    specWeight: '—',
    specStyle: '—',
    wins: 0,
    losses: 0,
    draws: 0,
    recordAvailable: false,
  })
  const competitorA = toCompetitor(ticket.competitorA)
  const competitorB = toCompetitor(ticket.competitorB)
  const fight: FightDTO = {
    id: ticket.fightId,
    seasonType: SeasonType.HUMAN_MMA,
    scheduledAt: ticket.scheduledAt,
    isFinished: ticket.outcome !== null,
    finishedAt: bet.settledAt?.toISOString() ?? null,
    winnerId: ticket.winnerId,
    isDraw: ticket.outcome === 'DRAW',
    competitorA,
    competitorB,
    odds: {
      a: ticket.oddA,
      b: ticket.oddB,
      houseMargin: HOUSE_MARGIN,
      impliedMargin: OddsService.impliedMargin(ticket.oddA, ticket.oddB),
    },
  }
  return { fight, chosenWinner: ticket.chosenWinnerId === competitorA.id ? competitorA : competitorB }
}

/** RF05 — DTO do bilhete de aposta. */
export class BetView {
  static render(bet: BetWithRelations): BetDTO {
    const selection = bet.fight && bet.chosenWinner
      ? { fight: FightView.render(bet.fight), chosenWinner: CompetitorView.render(bet.chosenWinner) }
      : renderMmaTicket(bet)
    return {
      id: bet.id,
      amount: bet.amount,
      oddAtPlacement: bet.oddAtPlacement,
      potentialPayout: bet.potentialPayout,
      status: bet.status,
      createdAt: bet.createdAt.toISOString(),
      settledAt: bet.settledAt?.toISOString() ?? null,
      ...selection,
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
