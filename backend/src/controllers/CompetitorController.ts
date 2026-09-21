import type { FastifyReply, FastifyRequest } from 'fastify'
import { CompetitorModel } from '../models/CompetitorModel.js'
import { CompetitorView } from '../views/CompetitorView.js'
import { NotFoundError } from '../lib/errors.js'
import { idParamSchema, parseOrThrow, seasonQuerySchema } from '../lib/validation.js'

/** RF02 — catálogo unificado de competidores. */
export class CompetitorController {
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
}
