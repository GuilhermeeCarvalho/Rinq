import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { SeasonView } from '../views/SeasonView.js'
import { getActiveSeason, setActiveSeason } from '../config/runtime.js'
import { seasonTypeSchema, parseOrThrow } from '../lib/validation.js'

const updateSeasonSchema = z.object({
  seasonType: seasonTypeSchema,
})

export class SeasonController {
  static async show(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      SeasonView.render({
        seasonType: getActiveSeason(),
        label: env.seasonLabel,
        endsAt: env.seasonEndsAt,
        easChannel: env.easChannel,
      }),
    )
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { seasonType } = parseOrThrow(updateSeasonSchema, request.body)
    setActiveSeason(seasonType)
    return reply.send({ success: true, activeSeason: getActiveSeason() })
  }
}
