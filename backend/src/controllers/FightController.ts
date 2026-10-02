import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { FightModel } from '../models/FightModel.js'
import { CompetitorModel } from '../models/CompetitorModel.js'
import { OddsService } from '../services/OddsService.js'
import { FightView } from '../views/FightView.js'
import { BetView } from '../views/BetView.js'
import { NotFoundError } from '../lib/errors.js'
import {
  booleanQuerySchema,
  idParamSchema,
  parseOrThrow,
  seasonQuerySchema,
  seasonTypeSchema,
} from '../lib/validation.js'
import { getActiveSeason } from '../config/runtime.js'

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

const oddsPreviewQuerySchema = z.object({
  competitorAId: z.uuid(),
  competitorBId: z.uuid(),
})

export class FightController {
  static async list(request: FastifyRequest, reply: FastifyReply) {
    const query = parseOrThrow(listFightsQuerySchema, request.query)

    const fights = await FightModel.listBySeason({
      seasonType: query.season,
      includeFinished: query.includeFinished,
      take: query.take,
    })

    return reply.send(FightView.renderList(fights, query.season))
  }

  static async show(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
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

    const [competitorA, competitorB] = await Promise.all([
      CompetitorModel.findById(query.competitorAId),
      CompetitorModel.findById(query.competitorBId),
    ])
    if (!competitorA || !competitorB) throw new NotFoundError('Competidor')

    return reply.send(OddsService.buildOdds(competitorA, competitorB))
  }
}
