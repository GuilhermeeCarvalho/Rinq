import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { CompetitorModel } from '../models/CompetitorModel.js'
import { CompetitorView } from '../views/CompetitorView.js'
import { NotFoundError } from '../lib/errors.js'
import { idParamSchema, parseOrThrow, seasonQuerySchema, seasonTypeSchema } from '../lib/validation.js'
import { getActiveSeason } from '../config/runtime.js'

const createCompetitorSchema = z.object({
  name: z.string().trim().min(2).max(100),
  team: z.string().trim().min(2).max(100),
  specWeight: z.string().trim().min(2).max(100),
  specStyle: z.string().trim().min(2).max(100),
  seasonType: seasonTypeSchema.default(getActiveSeason),
})

const updateCompetitorSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  team: z.string().trim().min(2).max(100).optional(),
  specWeight: z.string().trim().min(2).max(100).optional(),
  specStyle: z.string().trim().min(2).max(100).optional(),
})

export class CompetitorController {
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const body = parseOrThrow(createCompetitorSchema, request.body)
    const competitor = await CompetitorModel.create(body)
    return reply.status(201).send(CompetitorView.render(competitor))
  }

  static async list(request: FastifyRequest, reply: FastifyReply) {
    const { season } = parseOrThrow(seasonQuerySchema, request.query)
    const competitors = await CompetitorModel.listBySeason(season)

    return reply.send({
      seasonType: season,
      total: competitors.length,
      competitors: CompetitorView.renderMany(competitors),
    })
  }

  static async show(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const competitor = await CompetitorModel.findById(id)
    if (!competitor) throw new NotFoundError('Competidor')
    return reply.send(CompetitorView.render(competitor))
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const body = parseOrThrow(updateCompetitorSchema, request.body)
    const competitor = await CompetitorModel.update(id, body)
    return reply.send(CompetitorView.render(competitor))
  }

  static async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    await CompetitorModel.delete(id)
    return reply.status(204).send()
  }
}
