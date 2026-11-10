import { prisma } from '../lib/prisma.js'
import type { Db } from '../lib/prisma.js'
import { SeasonType } from '../../generated/prisma/enums.js'
import type { CompetitorModel as CompetitorRow } from '../../generated/prisma/models.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'

export interface CreateCompetitorInput {
  name: string
  team: string
  specWeight: string
  specStyle: string
  seasonType: SeasonType
  wins?: number | undefined
  losses?: number | undefined
  draws?: number | undefined
}

export interface UpdateCompetitorInput {
  name?: string | undefined
  team?: string | undefined
  specWeight?: string | undefined
  specStyle?: string | undefined
}

export type FightResult = 'WIN' | 'LOSS' | 'DRAW'

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
    if (input.seasonType !== SeasonType.ROBOT_ROOSTER) {
      throw new ValidationError('Os lutadores de MMA são fornecidos pela ESPN.')
    }
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

  static async update(
    id: string,
    input: UpdateCompetitorInput,
    db: Db = prisma,
  ): Promise<CompetitorRow> {
    const comp = await db.competitor.findUnique({ where: { id } })
    if (!comp) throw new NotFoundError('Competidor')
    return db.competitor.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.team !== undefined ? { team: input.team } : {}),
        ...(input.specWeight !== undefined ? { specWeight: input.specWeight } : {}),
        ...(input.specStyle !== undefined ? { specStyle: input.specStyle } : {}),
      },
    })
  }

  static async delete(id: string, db: Db = prisma): Promise<void> {
    const comp = await db.competitor.findUnique({
      where: { id },
      include: {
        fightsAsA: { select: { id: true } },
        fightsAsB: { select: { id: true } },
      },
    })
    if (!comp) throw new NotFoundError('Competidor')
    if (comp.fightsAsA.length > 0 || comp.fightsAsB.length > 0) {
      throw new ValidationError('Não é possível excluir competidor com lutas vinculadas.')
    }
    await db.competitor.delete({ where: { id } })
  }

  static async registerResult(id: string, result: FightResult, db: Db = prisma): Promise<void> {
    const field = result === 'WIN' ? 'wins' : result === 'LOSS' ? 'losses' : 'draws'
    await db.competitor.update({ where: { id }, data: { [field]: { increment: 1 } } })
  }
}
