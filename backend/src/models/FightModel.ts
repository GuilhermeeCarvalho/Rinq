import { prisma } from '../lib/prisma.js'
import type { Db } from '../lib/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { SeasonType } from '../../generated/prisma/enums.js'
import { CompetitorModel } from './CompetitorModel.js'
import { BetModel } from './BetModel.js'
import type { SettlementSummary } from './BetModel.js'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'
import { OddsService } from '../services/OddsService.js'

export const fightInclude = {
  competitorA: true,
  competitorB: true,
} satisfies Prisma.FightInclude

export type FightWithCompetitors = Prisma.FightGetPayload<{ include: typeof fightInclude }>

export interface ListFightsOptions {
  seasonType: SeasonType
  includeFinished?: boolean
  take?: number
}

export interface CreateFightInput {
  competitorAId: string
  competitorBId: string
  seasonType: SeasonType
  scheduledAt?: Date
}

export interface FinishFightResult {
  fight: FightWithCompetitors
  settlement: SettlementSummary
}

/** RF03 — cards de luta por temporada. */
export class FightModel {
  static async listBySeason(
    options: ListFightsOptions,
    db: Db = prisma,
  ): Promise<FightWithCompetitors[]> {
    const includeFinished = options.includeFinished ?? false
    return db.fight.findMany({
      where: {
        seasonType: options.seasonType,
        ...(includeFinished ? {} : { isFinished: false }),
      },
      include: fightInclude,
      orderBy: [{ isFinished: 'asc' }, { scheduledAt: 'asc' }],
      take: options.take ?? 50,
    })
  }

  static async findById(id: string, db: Db = prisma): Promise<FightWithCompetitors | null> {
    return db.fight.findUnique({ where: { id }, include: fightInclude })
  }

  /**
   * Cria o confronto já com as odds calculadas pelo OddsService a partir
   * do cartel atual dos dois competidores (RF04).
   */
  static async create(input: CreateFightInput, db: Db = prisma): Promise<FightWithCompetitors> {
    if (input.competitorAId === input.competitorBId) {
      throw new ValidationError('Um competidor não pode lutar contra si mesmo.')
    }

    const [competitorA, competitorB] = await Promise.all([
      CompetitorModel.findById(input.competitorAId, db),
      CompetitorModel.findById(input.competitorBId, db),
    ])
    if (!competitorA || !competitorB) throw new NotFoundError('Competidor')

    if (competitorA.seasonType !== input.seasonType || competitorB.seasonType !== input.seasonType) {
      throw new ValidationError('Os competidores precisam pertencer à temporada informada.')
    }

    const { oddA, oddB } = OddsService.buildOdds(competitorA, competitorB)

    return db.fight.create({
      data: {
        competitorAId: input.competitorAId,
        competitorBId: input.competitorBId,
        seasonType: input.seasonType,
        oddA,
        oddB,
        ...(input.scheduledAt === undefined ? {} : { scheduledAt: input.scheduledAt }),
      },
      include: fightInclude,
    })
  }

  /**
   * Encerra a luta, atualiza o cartel dos competidores e liquida as apostas
   * — tudo em uma única transação (RNF02). `winnerId === null` = empate.
   */
  static async finish(fightId: string, winnerId: string | null): Promise<FinishFightResult> {
    return prisma.$transaction(async (tx) => {
      const fight = await tx.fight.findUnique({ where: { id: fightId } })
      if (!fight) throw new NotFoundError('Luta')
      if (fight.isFinished) {
        throw new ConflictError('FIGHT_ALREADY_FINISHED', 'Esta luta já foi encerrada.')
      }

      const isCompetitorA = winnerId === fight.competitorAId
      const isCompetitorB = winnerId === fight.competitorBId
      if (winnerId !== null && !isCompetitorA && !isCompetitorB) {
        throw new ValidationError('O vencedor informado não participa desta luta.')
      }

      if (winnerId === null) {
        await CompetitorModel.registerResult(fight.competitorAId, 'DRAW', tx)
        await CompetitorModel.registerResult(fight.competitorBId, 'DRAW', tx)
      } else {
        const loserId = isCompetitorA ? fight.competitorBId : fight.competitorAId
        await CompetitorModel.registerResult(winnerId, 'WIN', tx)
        await CompetitorModel.registerResult(loserId, 'LOSS', tx)
      }

      const settlement = await BetModel.settleForFight(tx, fightId, winnerId)

      const updated = await tx.fight.update({
        where: { id: fightId },
        data: { isFinished: true, finishedAt: new Date(), winnerId },
        include: fightInclude,
      })

      return { fight: updated, settlement }
    })
  }
}
