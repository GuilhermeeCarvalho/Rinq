import { prisma } from '../lib/prisma.js'
import type { Db } from '../lib/prisma.js'
import { BetStatus } from '../../generated/prisma/enums.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { OddsService } from '../services/OddsService.js'
import { BusinessRuleError, NotFoundError, ValidationError } from '../lib/errors.js'

export const betInclude = {
  chosenWinner: true,
  fight: { include: { competitorA: true, competitorB: true } },
} satisfies Prisma.BetInclude

export type BetWithRelations = Prisma.BetGetPayload<{ include: typeof betInclude }>

export interface PlaceBetInput {
  userId: string
  fightId: string
  chosenWinnerId: string
  amount: number
}

export interface PlaceBetResult {
  bet: BetWithRelations
  balance: number
}

export interface SettlementSummary {
  won: number
  lost: number
  voided: number
  coinsPaid: number
}

/** RF05 / RNF02 — apostas e liquidação financeira atômica. */
export class BetModel {
  /**
   * Efetiva a aposta dentro de uma transação: valida a luta, congela a odd,
   * debita a carteira e grava o bilhete. Qualquer falha desfaz tudo.
   */
  static async place(input: PlaceBetInput): Promise<PlaceBetResult> {
    return prisma.$transaction(async (tx) => {
      const fight = await tx.fight.findUnique({ where: { id: input.fightId } })
      if (!fight) throw new NotFoundError('Luta')
      if (fight.isFinished) {
        throw new BusinessRuleError('FIGHT_CLOSED', 'Esta luta já foi encerrada. Apostas fechadas.')
      }

      const isCompetitorA = input.chosenWinnerId === fight.competitorAId
      const isCompetitorB = input.chosenWinnerId === fight.competitorBId
      if (!isCompetitorA && !isCompetitorB) {
        throw new ValidationError('O competidor escolhido não participa desta luta.')
      }

      const user = await tx.user.findUnique({ where: { id: input.userId } })
      if (!user) throw new NotFoundError('Usuário')

      const odd = isCompetitorA ? fight.oddA : fight.oddB
      const potentialPayout = OddsService.potentialPayout(input.amount, odd)

      // Débito atômico: a checagem de saldo vive no WHERE, então duas
      // requisições concorrentes nunca conseguem deixar a carteira negativa.
      const debited = await tx.user.updateMany({
        where: { id: input.userId, virtualCoins: { gte: input.amount } },
        data: { virtualCoins: { decrement: input.amount } },
      })
      if (debited.count === 0) {
        throw new BusinessRuleError(
          'INSUFFICIENT_FUNDS',
          `Saldo insuficiente: você tem ${user.virtualCoins} moedas e tentou apostar ${input.amount}.`,
        )
      }

      const bet = await tx.bet.create({
        data: {
          userId: input.userId,
          fightId: input.fightId,
          chosenWinnerId: input.chosenWinnerId,
          amount: input.amount,
          oddAtPlacement: odd,
          potentialPayout,
          status: BetStatus.PENDING,
        },
        include: betInclude,
      })

      const balance = user.virtualCoins - input.amount
      return { bet, balance }
    })
  }

  static async listByUser(userId: string, db: Db = prisma): Promise<BetWithRelations[]> {
    return db.bet.findMany({
      where: { userId },
      include: betInclude,
      orderBy: { createdAt: 'desc' },
    })
  }

  static async findById(id: string, db: Db = prisma): Promise<BetWithRelations | null> {
    return db.bet.findUnique({ where: { id }, include: betInclude })
  }

  /**
   * Liquida todas as apostas pendentes de uma luta.
   * `winnerId === null` significa empate: estorno integral (VOID).
   * Recebe o client da transação para rodar junto do encerramento da luta.
   */
  static async settleForFight(
    db: Db,
    fightId: string,
    winnerId: string | null,
  ): Promise<SettlementSummary> {
    const pending = await db.bet.findMany({ where: { fightId, status: BetStatus.PENDING } })
    const summary: SettlementSummary = { won: 0, lost: 0, voided: 0, coinsPaid: 0 }
    if (pending.length === 0) return summary

    const settledAt = new Date()
    const creditsByUser = new Map<string, number>()
    const addCredit = (userId: string, coins: number): void => {
      creditsByUser.set(userId, (creditsByUser.get(userId) ?? 0) + coins)
    }

    if (winnerId === null) {
      await db.bet.updateMany({
        where: { fightId, status: BetStatus.PENDING },
        data: { status: BetStatus.VOID, settledAt },
      })
      for (const bet of pending) {
        addCredit(bet.userId, bet.amount)
        summary.voided += 1
      }
    } else {
      const winners = pending.filter((bet) => bet.chosenWinnerId === winnerId)
      const losers = pending.filter((bet) => bet.chosenWinnerId !== winnerId)

      if (winners.length > 0) {
        await db.bet.updateMany({
          where: { id: { in: winners.map((bet) => bet.id) } },
          data: { status: BetStatus.WON, settledAt },
        })
        for (const bet of winners) {
          addCredit(bet.userId, OddsService.payoutInCoins(bet.potentialPayout))
          summary.won += 1
        }
      }

      if (losers.length > 0) {
        await db.bet.updateMany({
          where: { id: { in: losers.map((bet) => bet.id) } },
          data: { status: BetStatus.LOST, settledAt },
        })
        summary.lost = losers.length
      }
    }

    for (const [userId, coins] of creditsByUser) {
      await db.user.update({ where: { id: userId }, data: { virtualCoins: { increment: coins } } })
      summary.coinsPaid += coins
    }

    return summary
  }
}
