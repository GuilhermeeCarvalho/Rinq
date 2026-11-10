import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { FightModel } from '../models/FightModel.js'
import { CompetitorModel } from '../models/CompetitorModel.js'
import { OddsService } from '../services/OddsService.js'
import { FightView } from '../views/FightView.js'
import { BetView } from '../views/BetView.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import {
  booleanQuerySchema,
  idParamSchema,
  parseOrThrow,
  seasonQuerySchema,
  seasonTypeSchema,
} from '../lib/validation.js'
import { getActiveSeason } from '../config/runtime.js'
import { EspnMmaService, espnAthleteId, espnFightId } from '../services/EspnMmaService.js'
import { SeasonType } from '../../generated/prisma/enums.js'

const listFightsQuerySchema = seasonQuerySchema.extend({
  includeFinished: booleanQuerySchema.default(false),
  take: z.coerce.number().int().min(1).max(100).default(50),
})

const createFightSchema = z.object({
  competitorAId: z.uuid(),
  competitorBId: z.uuid(),
  seasonType: seasonTypeSchema.default(getActiveSeason),
  scheduledAt: z.coerce.date().optional(),
})

const updateFightSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
})

const finishFightSchema = z.object({
  winnerId: z.uuid().nullish(),
})

const fighterIdSchema = z.union([z.uuid(), z.string().regex(espnAthleteId)])
const oddsPreviewQuerySchema = z.object({
  competitorAId: fighterIdSchema,
  competitorBId: fighterIdSchema,
})
const readFightIdSchema = z.object({ id: z.union([z.uuid(), z.string().regex(espnFightId)]) })

export class FightController {
  static async list(request: FastifyRequest, reply: FastifyReply) {
    const query = parseOrThrow(listFightsQuerySchema, request.query)

    if (query.season === SeasonType.HUMAN_MMA) {
      const fights = await EspnMmaService.listFights(query.includeFinished, query.take)
      return reply.send({ seasonType: query.season, total: fights.length, fights })
    }
    const fights = await FightModel.listBySeason({
      seasonType: query.season,
      includeFinished: query.includeFinished,
      take: query.take,
    })

    return reply.send(FightView.renderList(fights, query.season))
  }

  static async show(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(readFightIdSchema, request.params)
    if (espnFightId.test(id)) return reply.send(await EspnMmaService.findFight(id))
    const fight = await FightModel.findById(id)
    if (!fight) throw new NotFoundError('Luta')
    return reply.send(FightView.render(fight))
  }

  static async create(request: FastifyRequest, reply: FastifyReply) {
    const body = parseOrThrow(createFightSchema, request.body)

    const fight = await FightModel.create({
      competitorAId: body.competitorAId,
      competitorBId: body.competitorBId,
      seasonType: body.seasonType,
      ...(body.scheduledAt === undefined ? {} : { scheduledAt: body.scheduledAt }),
    })

    return reply.status(201).send(FightView.render(fight))
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const body = parseOrThrow(updateFightSchema, request.body)
    const fight = await FightModel.update(id, body)
    return reply.send(FightView.render(fight))
  }

  static async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const result = await FightModel.cancel(id)
    return reply.send({ success: true, ...result })
  }

  static async finish(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const body = parseOrThrow(finishFightSchema, request.body ?? {})

    const { fight, settlement } = await FightModel.finish(id, body.winnerId ?? null)

    return reply.send({
      fight: FightView.render(fight),
      settlement: BetView.renderSettlement(settlement),
    })
  }

  static async oddsPreview(request: FastifyRequest, reply: FastifyReply) {
    const query = parseOrThrow(oddsPreviewQuerySchema, request.query)

    const externalA = espnAthleteId.test(query.competitorAId)
    const externalB = espnAthleteId.test(query.competitorBId)
    if (externalA !== externalB) throw new ValidationError('Os competidores precisam pertencer à mesma temporada.')
    if (externalA) {
      const [a, b] = await Promise.all([
        EspnMmaService.findCompetitor(query.competitorAId),
        EspnMmaService.findCompetitor(query.competitorBId),
      ])
      if (!a.competitor.recordAvailable || !b.competitor.recordAvailable) {
        throw new ValidationError('A ESPN ainda não publicou o cartel dos dois lutadores.')
      }
      return reply.send(OddsService.buildOdds(a.competitor.record, b.competitor.record))
    }

    const [competitorA, competitorB] = await Promise.all([
      CompetitorModel.findById(query.competitorAId),
      CompetitorModel.findById(query.competitorBId),
    ])
    if (!competitorA || !competitorB) throw new NotFoundError('Competidor')

    return reply.send(OddsService.buildOdds(competitorA, competitorB))
  }
}
