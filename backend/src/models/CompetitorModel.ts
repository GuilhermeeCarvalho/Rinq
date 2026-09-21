import { prisma } from '../lib/prisma.js'
import type { Db } from '../lib/prisma.js'
import type { SeasonType } from '../../generated/prisma/enums.js'
import type { CompetitorModel as CompetitorRow } from '../../generated/prisma/models.js'

export interface CreateCompetitorInput {
  name: string
  team: string
  specWeight: string
  specStyle: string
  seasonType: SeasonType
  wins?: number
  losses?: number
  draws?: number
}

export type FightResult = 'WIN' | 'LOSS' | 'DRAW'

/** RF02 — catálogo unificado: os mesmos campos servem lutadores e galos-robô. */
export class CompetitorModel {
  static async listBySeason(seasonType: SeasonType, db: Db = prisma): Promise<CompetitorRow[]> {
    return db.competitor.findMany({
      where: { seasonType },
      orderBy: [{ wins: 'desc' }, { name: 'asc' }],
    })
  }

  static async findById(id: string, db: Db = prisma): Promise<CompetitorRow | null> {
    return db.competitor.findUnique({ where: { id } })
  }

  static async create(input: CreateCompetitorInput, db: Db = prisma): Promise<CompetitorRow> {
    return db.competitor.create({
      data: {
        name: input.name,
        team: input.team,
        specWeight: input.specWeight,
        specStyle: input.specStyle,
        seasonType: input.seasonType,
        wins: input.wins ?? 0,
        losses: input.losses ?? 0,
        draws: input.draws ?? 0,
      },
    })
  }

  /** Atualiza o cartel (V-E-D) após o encerramento de uma luta. */
  static async registerResult(id: string, result: FightResult, db: Db = prisma): Promise<void> {
    const field = result === 'WIN' ? 'wins' : result === 'LOSS' ? 'losses' : 'draws'
    await db.competitor.update({ where: { id }, data: { [field]: { increment: 1 } } })
  }
}
