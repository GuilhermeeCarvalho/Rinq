import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env.js'
import { SeasonView } from '../views/SeasonView.js'

/** RF06 — o app pergunta "qual temporada está no ar?" e troca o tema. */
export class SeasonController {
  static async show(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      SeasonView.render({
        seasonType: env.activeSeason,
        label: env.seasonLabel,
        endsAt: env.seasonEndsAt,
        easChannel: env.easChannel,
      }),
    )
  }
}
